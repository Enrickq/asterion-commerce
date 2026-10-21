import { connectorError, fetchJson } from './shared.mjs';

export const WEATHER_SCENARIOS = ['clear', 'cloudy', 'stale', 'conflict', 'pending'];

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
  if (!['fixtures', 'aemet'].includes(mode)) throw connectorError('UNSUPPORTED_WEATHER_MODE', 'Modo meteorológico no admitido.', 500);
  const fetchImpl = options.fetch || globalThis.fetch;
  const now = options.now || Date.now;
  async function evidenceProvider(args = {}) {
    if (mode === 'fixtures') return createEvidence({ ...args, now });
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
      requiresReview: true, note: 'Observación real de la estación indicada. Faltan nubosidad local y una segunda fuente independiente; no habilita captura.' };
  }
  return { kind: mode, mode, createEvidence: evidenceProvider, evidenceProvider,
    status() { return { mode, configured: mode === 'fixtures' || Boolean(env.AEMET_API_KEY && env.AEMET_STATION_ID), simulated: mode === 'fixtures',
      ...(mode === 'aemet' && { stationId: env.AEMET_STATION_ID || null, settlementReady: false }) }; } };
}

export const evidenceProvider = (args) => createWeatherAdapter().createEvidence(args);
