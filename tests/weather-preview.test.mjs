import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createWeatherAdapter } from '../server/connectors/weather.mjs';

const NOW = Date.parse('2026-10-24T08:45:00Z');
const THREE_HOURS = 3 * 60 * 60_000;
const URL_FIXED = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=28.754&lon=-17.885&altitude=2396';
const forecast = () => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [-17.885, 28.754, 2396] },
  properties: { meta: { updated_at: '2026-10-24T08:20:02Z', units: { cloud_area_fraction: '%', relative_humidity: '%', wind_speed: 'm/s' } },
    timeseries: Array.from({ length: 12 }, (_, index) => ({ time: new Date(Date.parse('2026-10-24T08:00:00Z') + index * 60 * 60_000).toISOString(),
      data: { instant: { details: { cloud_area_fraction: 87.5, relative_humidity: 97.7, wind_speed: 11.1 } } } })) } });
const json = (data, headers = {}, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });
const adapter = (fetch, now = () => NOW) => createWeatherAdapter({ WEATHER_MODE: 'met-norway' }, { fetch, now });

test('MET preview uses a fixed identified HTTPS request and labels actual model data without authorizing settlement', async () => {
  const data = forecast();
  let count = 0;
  const weather = adapter(async (url, options) => {
    count++;
    assert.equal(url, URL_FIXED);
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers['User-Agent'], 'ASTERION/0.1 (+https://github.com/Enrickq/asterion-commerce)');
    assert.equal(options.headers.accept, 'application/json');
    assert.ok(options.signal instanceof AbortSignal);
    return json(data);
  });
  const evidence = await weather.createEvidence({ latitude: 0, longitude: 0, endpoint: 'https://attacker.example/', scenario: 'clear' });
  assert.equal(count, 1);
  assert.equal(evidence.provider, 'met-norway');
  assert.equal(evidence.evidenceType, 'model-forecast');
  assert.equal(evidence.simulated, false);
  assert.equal(evidence.observedAt, null);
  assert.equal(evidence.validAt, '2026-10-24T09:00:00.000Z');
  assert.equal(evidence.issuedAt, '2026-10-24T08:20:02.000Z');
  assert.equal(evidence.modelUpdatedAt, evidence.issuedAt);
  assert.equal(evidence.fetchedAt, new Date(NOW).toISOString());
  assert.equal(evidence.windKph, 40);
  assert.equal(evidence.cloudPercent, 87.5);
  assert.equal(evidence.humidityPercent, 97.7);
  assert.equal(evidence.complete, false);
  assert.equal(evidence.requiresReview, true);
  assert.equal(evidence.settlementReady, false);
  assert.equal(evidence.sources.length, 1);
  assert.equal(evidence.sources[0].type, 'model-forecast');
  assert.equal(evidence.sources[0].observedAt, null);
  assert.equal(evidence.sources[0].settlementReady, false);
  assert.equal(evidence.sources[0].independenceGroup, 'met-norway-locationforecast');
  assert.equal(evidence.requestedLocation.latitude, 28.754);
  assert.equal(evidence.requestedLocation.altitudeMeters, 2396);
  assert.equal(evidence.modelGrid.kind, 'provider-returned-location');
  assert.equal(evidence.modelGrid.gridCellCoordinatesKnown, false);
  assert.equal(evidence.dataHash, createHash('sha256').update(JSON.stringify(data)).digest('hex'));
  assert.equal(evidence.dataHashAlgorithm, 'sha256-json');
  assert.equal(evidence.attribution.name, 'MET Norway');
  assert.equal(evidence.attribution.licenseUrl, 'https://creativecommons.org/licenses/by/4.0/');
  assert.match(evidence.attribution.changes, /m\/s to km\/h/);
  assert.equal(weather.status().settlementReady, false);
  assert.equal(weather.status().evidenceType, 'model-forecast');
  assert.equal(weather.status().configured, true);
  assert.equal(weather.status().simulated, false);
});

test('Missing, null, string or out-of-range fields are rejected instead of becoming favorable zeroes', async () => {
  for (const field of ['cloud_area_fraction', 'relative_humidity', 'wind_speed']) {
    for (const value of [null, undefined, '0', -1, Infinity, field === 'wind_speed' ? 200 : 101]) {
      const data = forecast();
      for (const point of data.properties.timeseries) point.data.instant.details[field] = value;
      await assert.rejects(adapter(async () => json(data)).createEvidence(), { code: 'INVALID_WEATHER_RESPONSE' });
    }
  }
  const data = forecast();
  for (const point of data.properties.timeseries) point.data.instant.details = { cloud_area_fraction: 0, relative_humidity: 0, wind_speed: 0 };
  const evidence = await adapter(async () => json(data)).createEvidence();
  assert.equal(evidence.cloudPercent, 0);
  assert.equal(evidence.windKph, 0);
  assert.equal(evidence.settlementReady, false);
});

test('Unexpected units, forecast dates and returned locations fail closed', async () => {
  const mutations = [
    d => { d.properties.meta.units.cloud_area_fraction = 'fraction'; },
    d => { d.properties.meta.units.relative_humidity = undefined; },
    d => { d.properties.meta.units.wind_speed = 'km/h'; },
    d => { d.properties.meta.updated_at = '2026-10-24T09:00:00Z'; },
    d => { d.properties.meta.updated_at = '2026-10-22T08:20:02Z'; },
    d => { d.properties.meta.updated_at = '2026-02-31T08:20:02Z'; },
    d => { d.properties.timeseries[0].time = 1792828800; },
    d => { d.properties.timeseries[0].time = '2026-02-31T08:00:00Z'; },
    d => { d.properties.timeseries = [{ time: '2026-10-25T08:00:00Z' }]; },
    d => { d.properties.timeseries = []; },
    d => { d.geometry.coordinates = [0, 0, 2396]; },
    d => { d.geometry.coordinates[2] = 0; },
    d => { d.geometry.coordinates[0] = '-17.885'; },
  ];
  for (const mutate of mutations) {
    const data = forecast(); mutate(data);
    await assert.rejects(adapter(async () => json(data)).createEvidence(), { code: 'INVALID_WEATHER_RESPONSE' });
  }
});

test('Three-hour cache reselects only downloaded forecast times and does not refresh fetch or model issue time', async () => {
  let time = NOW;
  let count = 0;
  const weather = adapter(async () => { count++; return json(forecast(), { expires: new Date(NOW + 30 * 60_000).toUTCString() }); }, () => time);
  const first = await weather.createEvidence();
  first.sources[0].cloudPercent = 0;
  time += 2 * 60 * 60_000;
  const cached = await weather.createEvidence();
  assert.equal(count, 1);
  assert.equal(cached.cloudPercent, 87.5);
  assert.equal(cached.sources[0].cloudPercent, 87.5);
  assert.equal(cached.validAt, '2026-10-24T11:00:00.000Z');
  assert.equal(cached.fetchedAt, new Date(NOW).toISOString());
  assert.equal(cached.issuedAt, first.issuedAt);
  assert.equal(cached.cache.expiresAt, new Date(NOW + THREE_HOURS).toISOString());
  time = NOW + THREE_HOURS;
  await weather.createEvidence();
  assert.equal(count, 2);
});

test('Expires can extend the minimum cache lifetime and conditional 304 preserves the original data provenance', async () => {
  let time = NOW;
  let count = 0;
  const modified = 'Sat, 24 Oct 2026 08:37:49 GMT';
  const weather = adapter(async (_url, options) => {
    count++;
    if (count === 1) return json(forecast(), { expires: new Date(NOW + 4 * 60 * 60_000).toUTCString(), 'last-modified': modified });
    assert.equal(options.headers['If-Modified-Since'], modified);
    return new Response(null, { status: 304, headers: { expires: new Date(time + 5 * 60 * 60_000).toUTCString() } });
  }, () => time);
  const first = await weather.createEvidence();
  time += THREE_HOURS + 60_000;
  await weather.createEvidence();
  assert.equal(count, 1);
  time = NOW + 4 * 60 * 60_000;
  const revalidated = await weather.createEvidence();
  assert.equal(count, 2);
  assert.equal(revalidated.fetchedAt, first.fetchedAt);
  assert.equal(revalidated.dataHash, first.dataHash);
  assert.equal(revalidated.revalidatedAt, new Date(time).toISOString());
  assert.equal(revalidated.cache.expiresAt, new Date(time + 5 * 60 * 60_000).toISOString());
  assert.equal(revalidated.validAt, '2026-10-24T13:00:00.000Z');
});

test('Concurrent preview calls share one provider request, including a refresh after expiry', async () => {
  let time = NOW;
  let count = 0;
  let release;
  const weather = adapter(async () => { count++; await new Promise(resolve => { release = resolve; }); return json(forecast()); }, () => time);
  const first = weather.createEvidence();
  const second = weather.createEvidence();
  assert.equal(count, 1);
  release();
  const initial = await Promise.all([first, second]);
  assert.deepEqual(initial[0], initial[1]);
  time += THREE_HOURS;
  const third = weather.createEvidence();
  const fourth = weather.createEvidence();
  assert.equal(count, 2);
  release();
  const refreshed = await Promise.all([third, fourth]);
  assert.deepEqual(refreshed[0], refreshed[1]);
  assert.equal(refreshed[0].fetchedAt, new Date(time).toISOString());
});

test('A future Last-Modified value is never sent back as If-Modified-Since', async () => {
  let time = NOW;
  let count = 0;
  const weather = adapter(async (_url, options) => {
    count++;
    assert.equal(options.headers['If-Modified-Since'], undefined);
    return json(forecast(), { 'last-modified': 'Sun, 25 Oct 2026 08:00:00 GMT' });
  }, () => time);
  await weather.createEvidence();
  time += THREE_HOURS;
  await weather.createEvidence();
  assert.equal(count, 2);
});

test('Provider failures are cached without fixture fallback or stale successful data', async () => {
  for (const fail of [async () => { throw new Error('network failure'); }, async () => json({}, {}, 429), async () => new Response('not-json', { status: 200 }), async () => new Response(null, { status: 304 })]) {
    let count = 0;
    const weather = adapter(async () => { count++; return fail(); });
    await assert.rejects(weather.createEvidence());
    await assert.rejects(weather.createEvidence());
    assert.equal(count, 1);
  }
  let time = NOW;
  let count = 0;
  const weather = adapter(async () => ++count === 1 ? json(forecast()) : json({}, {}, 503), () => time);
  await weather.createEvidence();
  time += THREE_HOURS;
  await assert.rejects(weather.createEvidence(), { code: 'PROVIDER_REJECTED' });
  await assert.rejects(weather.createEvidence(), { code: 'PROVIDER_REJECTED' });
  assert.equal(count, 2);
});
