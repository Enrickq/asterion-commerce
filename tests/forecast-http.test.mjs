import test from 'node:test';
import assert from 'node:assert/strict';
import { createHttpServer, startServer } from '../server/index.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { once } from 'node:events';

async function fixture(t, weatherPreview) {
  // No financial methods are available: this route must work without touching
  // agreement state or entering any payment side-effect path.
  const core = new Proxy({ provider: 'demo' }, {
    get(target, key) {
      if (!(key in target)) throw new Error(`Unexpected core access: ${String(key)}`);
      return target[key];
    },
  });
  const server = createHttpServer({ core, env: { PUBLIC_DEMO: 'true' }, weatherPreview });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('forecast preview is read-only and cannot use caller coordinates or modify a mandate', async t => {
  const calls = [];
  const preview = { provider: 'met-norway', simulated: false, evidenceType: 'model-forecast', settlementReady: false,
    complete: false, cloudPercent: 80, windKph: 35, humidityPercent: 95, observedAt: null };
  const origin = await fixture(t, async (...args) => { calls.push(args); return preview; });
  const result = await fetch(origin + '/api/weather/preview?lat=0&lon=0&url=https://example.com');
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await result.json(), { preview, usage: 'planning-only' });
  assert.deepEqual(calls, [[]], 'No caller input reaches the provider adapter');

  const rejected = await fetch(origin + '/api/weather/preview', { method: 'POST' });
  assert.equal(rejected.status, 405);
  assert.equal(rejected.headers.get('allow'), 'GET');
  assert.equal(calls.length, 1);
});

test('forecast failures remain errors without favorable data or payment side effects', async t => {
  const origin = await fixture(t, async () => { throw Object.assign(new Error('Weather unavailable'), { code: 'PROVIDER_UNAVAILABLE', statusCode: 502 }); });
  const response = await fetch(origin + '/api/weather/preview');
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: { code: 'PROVIDER_UNAVAILABLE', message: 'Weather unavailable' } });
});

test('forecast preview and agreement evaluation share one provider cache in MET mode', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'asterion-forecast-http-'));
  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).hostname, 'api.met.no');
    providerCalls++;
    const current = new Date().toISOString();
    return new Response(JSON.stringify({ type: 'Feature', geometry: { type: 'Point', coordinates: [-17.885, 28.754, 2396] },
      properties: { meta: { updated_at: current, units: { cloud_area_fraction: '%', relative_humidity: '%', wind_speed: 'm/s' } },
        timeseries: [{ time: current, data: { instant: { details: { cloud_area_fraction: 2, relative_humidity: 20, wind_speed: 1 } } } }] } }),
    { status: 200, headers: { 'content-type': 'application/json' } });
  };
  let running;
  t.after(async () => {
    globalThis.fetch = originalFetch;
    if (running) {
      await new Promise(resolveClose => { running.server.close(resolveClose); running.server.closeAllConnections(); });
      await running.core.waitForAutopilotIdle();
      running.store.close();
    }
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('asterion-forecast-http-'));
    rmSync(directory, { recursive: true, force: true });
  });
  running = startServer({ HOST: '127.0.0.1', PORT: '0', DATA_DIR: directory, PUBLIC_DEMO: 'true',
    PAYMENTS_MODE: 'demo', AGENT_MODE: 'deterministic', WEATHER_MODE: 'met-norway' });
  await once(running.server, 'listening');
  const origin = `http://127.0.0.1:${running.server.address().port}`;
  let cookie;
  const request = async (path, input) => {
    const response = await originalFetch(origin + path, { headers: { ...(cookie && { cookie }), ...(input && { 'content-type': 'application/json' }) },
      ...(input && { method: 'POST', body: JSON.stringify(input) }) });
    cookie ??= response.headers.get('set-cookie')?.split(';')[0];
    assert.ok(response.ok);
    return response.json();
  };
  const preview = await request('/api/weather/preview');
  assert.equal(preview.preview.settlementReady, false);
  let agreement = await request('/api/negotiate', { intent: 'Stargazing for two in La Palma with a guide and private transport.', budgetMinor: 150000, participants: 2 });
  const path = `/api/agreements/${agreement.id}`;
  await request(path + '/consent', { agreementHash: agreement.hash });
  await request(path + '/order', {});
  await request(path + '/authorize', { agreementHash: agreement.hash });
  agreement = await request(path + '/evaluate', { scenario: 'live' });
  assert.equal(agreement.status, 'CONDITION_FAILED');
  assert.equal(agreement.evidence.dataHash, preview.preview.dataHash);
  assert.equal(agreement.payment.captureId, null);
  assert.equal(providerCalls, 1, 'Preview and evaluation must not download the same forecast twice');
});
