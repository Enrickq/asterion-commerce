import { connectorError, fetchJson, hash } from './shared.mjs';

export const WEATHER_SCENARIOS = ['clear', 'cloudy', 'stale', 'conflict', 'pending'];

const FORECAST_LOCATION = Object.freeze({ name: 'Entorno del Roque de los Muchachos', latitude: 28.754, longitude: -17.885, altitudeMeters: 2396 });
const MET_FORECAST_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=28.754&lon=-17.885&altitude=2396';
const MET_USER_AGENT = 'ASTERION/0.1 (+https://github.com/Enrickq/asterion-commerce)';
// La Palma is outside the Nordic region: MET requests at least three hours
// between identical queries. Failures share this cooldown, so outages cannot
// turn a public preview endpoint into a request storm.
const MET_CACHE_MS = 3 * 60 * 60_000;
const inRange = (value, minimum, maximum) => typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;

function forecastError(message) {
  return connectorError('INVALID_WEATHER_RESPONSE', `MET Norway: ${message}`);
}

function forecastTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 19) === value.slice(0, 19) ? parsed : NaN;
}

function metForecastEvidence(snapshot, time, cacheUntil) {
  const data = snapshot.data;
  const coordinates = data?.geometry?.coordinates;
  if (data?.type !== 'Feature' || data.geometry?.type !== 'Point' || !Array.isArray(coordinates) || coordinates.length !== 3 ||
      !inRange(coordinates[0], -180, 180) || !inRange(coordinates[1], -90, 90) || !inRange(coordinates[2], -500, 9000) ||
      Math.abs(coordinates[0] - FORECAST_LOCATION.longitude) > 0.001 || Math.abs(coordinates[1] - FORECAST_LOCATION.latitude) > 0.001 ||
      Math.abs(coordinates[2] - FORECAST_LOCATION.altitudeMeters) > 1) {
    throw forecastError('la ubicación devuelta no corresponde a la consulta fija.');
  }
  const meta = data.properties?.meta;
  if (meta?.units?.cloud_area_fraction !== '%' || meta.units.relative_humidity !== '%' || meta.units.wind_speed !== 'm/s') {
    throw forecastError('faltan las unidades esperadas de nubosidad, humedad o viento.');
  }
  const issuedTime = forecastTime(meta.updated_at);
  if (!Number.isFinite(issuedTime) || issuedTime > time + 5 * 60_000 || time - issuedTime > 24 * 60 * 60_000) {
    throw forecastError('la fecha de actualización del modelo es inválida o está fuera del intervalo admitido.');
  }
  const series = data.properties?.timeseries;
  if (!Array.isArray(series) || series.length === 0 || series.length > 500) throw forecastError('no hay una serie temporal válida.');
  let selected;
  let nearest = Infinity;
  for (const item of series) {
    const validTime = forecastTime(item?.time);
    if (!Number.isFinite(validTime)) throw forecastError('la serie incluye una fecha de validez inválida.');
    const distance = Math.abs(validTime - time);
    if (distance < nearest) { selected = item; nearest = distance; }
  }
  if (nearest > MET_CACHE_MS) throw forecastError('no hay un punto de previsión cercano a la hora de consulta.');
  const details = selected.data?.instant?.details;
  if (!inRange(details?.cloud_area_fraction, 0, 100) || !inRange(details?.relative_humidity, 0, 100) || !inRange(details?.wind_speed, 0, 500 / 3.6)) {
    throw forecastError('faltan valores numéricos válidos de nubosidad, humedad o viento.');
  }
  const reading = { cloudPercent: details.cloud_area_fraction, humidityPercent: details.relative_humidity,
    windKph: Math.round(details.wind_speed * 36) / 10 };
  const attribution = { name: 'MET Norway', url: 'https://www.met.no/', license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', termsUrl: 'https://docs.api.met.no/doc/TermsOfService.html',
    changes: 'Selected a forecast time, renamed fields and converted wind speed from m/s to km/h.' };
  const modelGrid = { longitude: coordinates[0], latitude: coordinates[1], altitudeMeters: coordinates[2],
    kind: 'provider-returned-location', gridCellCoordinatesKnown: false,
    note: 'The provider returns the forecast location, not sensor coordinates or the underlying model grid cell. Altitude adjusts temperature only.' };
  const provenance = { observedAt: null, issuedAt: new Date(issuedTime).toISOString(), modelUpdatedAt: new Date(issuedTime).toISOString(),
    validAt: new Date(forecastTime(selected.time)).toISOString(), fetchedAt: snapshot.fetchedAt,
    ...(snapshot.revalidatedAt && { revalidatedAt: snapshot.revalidatedAt }), dataHash: snapshot.dataHash,
    dataHashAlgorithm: 'sha256-json', sourceUrl: MET_FORECAST_URL, simulated: false, complete: false,
    requiresReview: true, settlementReady: false, requestedLocation: { ...FORECAST_LOCATION }, modelGrid, attribution };
  const source = { id: 'met-norway-locationforecast', name: 'MET Norway · model forecast', provider: 'met-norway', type: 'model-forecast',
    independenceGroup: 'met-norway-locationforecast', ...provenance, ...reading };
  return { provider: 'met-norway', evidenceType: 'model-forecast', scenario: 'forecast-preview', ...provenance, ...reading,
    sources: [source], conflict: false, cache: { minimumTtlSeconds: MET_CACHE_MS / 1000, expiresAt: new Date(cacheUntil).toISOString(),
      providerExpiresAt: snapshot.providerExpiresAt },
    note: 'Previsión numérica para planificación; no es una observación local ni una garantía de cielo despejado. Una sola fuente de modelo no habilita captura.' };
}

function createMetForecastProvider(fetchImpl, now) {
  let snapshot;
  let cacheError;
  let cacheUntil = 0;
  let inFlight;
  let lastModified;
  async function load() {
    const startedAt = timestamp(now);
    if (inFlight) return inFlight;
    if (startedAt < cacheUntil) {
      if (cacheError) throw cacheError;
      if (snapshot) return snapshot;
    }
    inFlight = (async () => {
      cacheUntil = startedAt + MET_CACHE_MS;
      cacheError = undefined;
      try {
        let response;
        try {
          response = await fetchImpl(MET_FORECAST_URL, { redirect: 'error', signal: AbortSignal.timeout(15_000),
            headers: { accept: 'application/json', 'User-Agent': MET_USER_AGENT, ...(lastModified && { 'If-Modified-Since': lastModified }) } });
        } catch { throw connectorError('PROVIDER_UNAVAILABLE', 'MET Norway: conexión no disponible o tiempo de espera agotado.'); }
        const fetchedTime = timestamp(now);
        const expires = Date.parse(response.headers?.get('expires'));
        if (Number.isFinite(expires)) cacheUntil = Math.max(cacheUntil, expires);
        const providerExpiresAt = Number.isFinite(expires) ? new Date(expires).toISOString() : null;
        const modified = response.headers?.get('last-modified');
        const modifiedTime = Date.parse(modified);
        const safeModified = typeof modified === 'string' && modified.length <= 100 && Number.isFinite(modifiedTime) && modifiedTime <= fetchedTime ? modified : undefined;
        if (response.status === 304) {
          if (!snapshot) throw forecastError('se recibió 304 sin una previsión previamente descargada.');
          snapshot = { ...snapshot, revalidatedAt: new Date(fetchedTime).toISOString(), providerExpiresAt };
          lastModified = safeModified || lastModified;
        } else {
          if (response.status !== 200) throw connectorError('PROVIDER_REJECTED', `MET Norway: solicitud rechazada (HTTP ${response.status}).`, 502, { httpStatus: response.status });
          let data;
          try { data = await response.json(); } catch { throw forecastError('la respuesta no contiene JSON válido.'); }
          const candidate = { data, fetchedAt: new Date(fetchedTime).toISOString(), dataHash: hash(JSON.stringify(data)), providerExpiresAt };
          metForecastEvidence(candidate, fetchedTime, cacheUntil);
          snapshot = candidate;
          lastModified = safeModified;
        }
        return snapshot;
      } catch (error) { cacheError = error; throw error; }
    })();
    try { return await inFlight; } finally { inFlight = undefined; }
  }
  return async () => {
    const result = await load();
    // A cache hit may select a later, already-downloaded forecast point. It
    // never changes provider issue time or pretends to refresh fetchedAt.
    return metForecastEvidence(result, timestamp(now), cacheUntil);
  };
}

function timestamp(now) {
  const result = typeof now === 'function' ? now() : now;
  return typeof result === 'number' ? result : new Date(result).getTime();
}

export function createEvidence({ agreement, scenario = 'clear', now = Date.now } = {}) {
  if (!WEATHER_SCENARIOS.includes(scenario)) throw connectorError('INVALID_WEATHER_SCENARIO', 'Escenario de meteorología no válido.', 400);
  const time = timestamp(now);
  const observedAt = new Date(time - (scenario === 'stale' ? 90 * 60_000 : 25_000)).toISOString();
  const reading = { cloudPercent: scenario === 'cloudy' ? 82 : scenario === 'pending' ? 32 : 7,
    windKph: scenario === 'cloudy' ? 38 : 12, humidityPercent: scenario === 'cloudy' ? 91 : 34 };
  const sources = [
    { id: 'fixture-summit', name: 'Sensor de cumbre · DEMO', provider: 'local-fixture', type: 'simulated-sensor', observedAt, simulated: true,
      station: { id: 'DEMO-ROQUE', latitude: 28.754, longitude: -17.885, altitudeMeters: 2396 }, ...reading },
    { id: 'fixture-forecast', name: 'Modelo de nubosidad · DEMO', provider: 'local-fixture', type: 'simulated-forecast', observedAt, simulated: true,
      cloudPercent: scenario === 'conflict' ? 76 : reading.cloudPercent + 2, windKph: reading.windKph + 1, humidityPercent: reading.humidityPercent + 1 },
  ];
  return { ...reading, observedAt, issuedAt: new Date(time).toISOString(), sources, conflict: scenario === 'conflict', scenario,
    simulated: true, provider: 'local-fixture', evidenceType: 'demo-scenario', agreementId: agreement?.id,
    location: { name: 'Entorno del Roque de los Muchachos · escenario demo', latitude: 28.754, longitude: -17.885, altitudeMeters: 2396 },
    note: 'Escenario reproducible; no es una predicción ni una observación meteorológica real.' };
}

function safeAemetUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw connectorError('INVALID_WEATHER_RESPONSE', 'AEMET devolvió una URL de datos no válida.'); }
  if (url.protocol !== 'https:' || !['opendata.aemet.es', 'www.aemet.es'].includes(url.hostname) || url.username || url.password) {
    throw connectorError('INVALID_WEATHER_RESPONSE', 'AEMET devolvió un origen de datos no permitido.');
  }
  return url;
}

export function createWeatherAdapter(env = process.env, options = {}) {
  const mode = env.WEATHER_MODE || 'fixtures';
  if (!['fixtures', 'aemet', 'met-norway'].includes(mode)) throw connectorError('UNSUPPORTED_WEATHER_MODE', 'Modo meteorológico no admitido.', 500);
  const fetchImpl = options.fetch || globalThis.fetch;
  const now = options.now || Date.now;
  const forecastProvider = mode === 'met-norway' ? createMetForecastProvider(fetchImpl, now) : null;
  async function evidenceProvider(args = {}) {
    if (mode === 'fixtures') return createEvidence({ ...args, now });
    if (mode === 'met-norway') return forecastProvider();
    if (!env.AEMET_API_KEY || !/^[A-Za-z0-9-]{2,20}$/.test(env.AEMET_STATION_ID || '')) {
      throw connectorError('WEATHER_NOT_CONFIGURED', 'Configura AEMET_API_KEY y el indicativo real AEMET_STATION_ID.', 503);
    }
    const endpoint = `https://opendata.aemet.es/opendata/api/observacion/convencional/datos/estacion/${encodeURIComponent(env.AEMET_STATION_ID)}`;
    const envelope = await fetchJson(fetchImpl, endpoint, { headers: { api_key: env.AEMET_API_KEY, accept: 'application/json' } }, 'AEMET');
    if (Number(envelope.estado) !== 200 || !envelope.datos) throw connectorError('WEATHER_NO_OBSERVATIONS', 'AEMET no devolvió observaciones para esa estación.');
    const observations = await fetchJson(fetchImpl, safeAemetUrl(envelope.datos), {}, 'AEMET');
    if (!Array.isArray(observations)) throw connectorError('INVALID_WEATHER_RESPONSE', 'AEMET no devolvió una lista de observaciones.');
    const rows = observations.filter((row) => row.idema === env.AEMET_STATION_ID && Number.isFinite(Date.parse(row.fint)))
      .sort((a, b) => Date.parse(b.fint) - Date.parse(a.fint));
    const row = rows[0];
    if (!row) throw connectorError('WEATHER_STATION_MISMATCH', 'Los datos recibidos no corresponden a la estación configurada.');
    const source = { id: `aemet-${row.idema}`, name: `AEMET · ${row.ubi || row.idema}`, provider: 'aemet', type: 'conventional-observation',
      observedAt: new Date(row.fint).toISOString(), simulated: false, station: { id: row.idema, name: row.ubi,
        latitude: row.lat, longitude: row.lon, altitudeMeters: row.alt },
      windKph: Number.isFinite(row.vv) ? Math.round(row.vv * 3.6 * 10) / 10 : null,
      humidityPercent: Number.isFinite(row.hr) ? row.hr : null };
    // Conventional station data does not certify cloud cover, observatory access,
    // or a second independent source. Fail closed; never substitute city forecasts.
    return { observedAt: source.observedAt, issuedAt: new Date(timestamp(now)).toISOString(), cloudPercent: null,
      windKph: source.windKph, humidityPercent: source.humidityPercent, sources: [source], conflict: false,
      scenario: 'aemet-observation', provider: 'aemet', simulated: false, complete: false, evidenceType: 'insufficient-live-observation',
      requiresReview: true, settlementReady: false, note: 'Observación real de la estación indicada. Faltan nubosidad local y una segunda fuente independiente; no habilita captura.' };
  }
  return { kind: mode, mode, createEvidence: evidenceProvider, evidenceProvider,
    status() { return { mode, configured: mode === 'fixtures' || mode === 'met-norway' || Boolean(env.AEMET_API_KEY && env.AEMET_STATION_ID), simulated: mode === 'fixtures',
      ...(mode === 'aemet' && { stationId: env.AEMET_STATION_ID || null, settlementReady: false }),
      ...(mode === 'met-norway' && { evidenceType: 'model-forecast', settlementReady: false, cacheMinimumSeconds: MET_CACHE_MS / 1000,
        requestedLocation: { ...FORECAST_LOCATION } }) }; } };
}

export const evidenceProvider = (args) => createWeatherAdapter().createEvidence(args);
