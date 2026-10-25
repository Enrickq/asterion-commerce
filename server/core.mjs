import { createHash, randomUUID } from 'node:crypto';

export class DomainError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'DomainError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const fail = (status, code, message) => { throw new DomainError(status, code, message); };
const clone = value => structuredClone(value);
export const MAX_BUDGET_MINOR = 10_000_000;
const DEFAULT_ALLOCATIONS = [
  { id: 'guide', name: 'Guía astronómico privado', role: 'guide', amountMinor: 40000 },
  { id: 'telescope', name: 'Telescopio y operador', role: 'telescope', amountMinor: 50000 },
  { id: 'transport', name: 'Transporte privado', role: 'transport', amountMinor: 40000 },
  { id: 'organizer', name: 'Organizador · remanente bruto', role: 'organizer', amountMinor: 18000 },
];
const DEFAULT_POLICY = {
  version: '1.1',
  maxCloudPercent: 15,
  maxWindKph: 25,
  maxHumidityPercent: 85,
  maxAgeSeconds: 600,
  maxClockSkewSeconds: 60,
  minimumSources: 2,
  maxSourceCloudDifferencePercent: 20,
  site: 'Roque de los Muchachos · La Palma',
  // Consent covers these application tolerances; they are not an astronomical guarantee.
  siteLocation: { latitude: 28.754, longitude: -17.885, altitudeMeters: 2396, maxDistanceMeters: 1500, maxAltitudeDifferenceMeters: 150 },
  realEvidence: { version: '1.0', sourceType: 'observation', independenceBasis: 'adapter-declared' },
  cancellation: 'Anular antes de capturar si las condiciones no se cumplen al vencimiento.',
  autonomy: { requiresExplicitArming: true, delaySeconds: 3, settlement: 'Captura condicionada y desembolsos posteriores separados.' },
};

/** Canonical JSON excludes undefined and sorts every object key. Numbers must be finite. */
export function canonicalize(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Los números deben ser finitos.');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(item => canonicalize(item === undefined ? null : item)).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  throw new TypeError('Valor no serializable.');
}
export const hashObject = value => createHash('sha256').update(canonicalize(value)).digest('hex');

export function agreementTerms(agreement) {
  return {
    schemaVersion: agreement.schemaVersion,
    id: agreement.id,
    ownerId: agreement.ownerId,
    createdAt: agreement.createdAt,
    expiresAt: agreement.expiresAt,
    intent: agreement.intent,
    participants: agreement.participants,
    budgetMinor: agreement.budgetMinor,
    totalMinor: agreement.totalMinor,
    currency: agreement.currency,
    allocations: agreement.allocations,
    policy: agreement.policy,
    offers: agreement.offers,
    paymentProvider: agreement.payment?.provider,
    merchant: agreement.merchant,
  };
}
export const computeAgreementHash = agreement => hashObject(agreementTerms(agreement));

export function verifyEventChain(events = []) {
  let previousHash = null;
  for (const event of events) {
    const { hash, ...payload } = event;
    if (payload.prevHash !== previousHash || hashObject(payload) !== hash) return false;
    previousHash = hash;
  }
  return true;
}

function text(value, max = 4000) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max) : '';
}
// External adapters can return useful metadata; credentials must never enter receipts/events.
export function publicData(value, depth = 0) {
  if (depth > 12) return null;
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return text(value, 12000);
  if (Array.isArray(value)) return value.slice(0, 100).map(item => publicData(item, depth + 1));
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      if (/^(?:__proto__|constructor|prototype|authorization|access[_-]?token|refresh[_-]?token|client[_-]?secret|api[_-]?key|password|secret)$/i.test(key)) continue;
      if (item !== undefined && typeof item !== 'function') result[key] = publicData(item, depth + 1);
    }
    return result;
  }
  return null;
}

// Audit payloads were sanitized before hashing in appendEvent. Serializing that
// committed data again with input bounds would silently change the proof (for
// example by dropping every event after number 100). Only trusted, validated
// agreement/receipt records use this serializer; adapter/model input remains bounded.
function publicRecord(value) {
  const result = publicData(value);
  if (Array.isArray(value?.events)) result.events = clone(value.events);
  if (value?.schemaVersion === 'asterion.receipt.v1') result.agreement = clone(value.agreement);
  return result;
}

function appendEvent(agreement, type, message, at, data = {}) {
  const payload = {
    id: randomUUID(), type, message, at,
    data: publicData(data),
    prevHash: agreement.events.at(-1)?.hash ?? null,
  };
  agreement.events.push({ ...payload, hash: hashObject(payload) });
  agreement.updatedAt = at;
}

const inRange = (value, minimum, maximum) => typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
const isMinor = value => Number.isSafeInteger(value) && value >= 0;

const sourceIdentity = value => typeof value === 'string' && value.trim().length <= 200 ? text(value, 200).normalize('NFKC').toLowerCase() : '';
const validLocation = location => inRange(location?.latitude, -90, 90) && inRange(location?.longitude, -180, 180) && inRange(location?.altitudeMeters, -500, 10000);
function zonedObservationTimestamp(value) {
  if (typeof value !== 'string') return NaN;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return NaN;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  if (!inRange(month, 1, 12) || !inRange(day, 1, 31) || !inRange(hour, 0, 23) || !inRange(minute, 0, 59) || !inRange(second, 0, 59)) return NaN;
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  if (calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return NaN;
  return Date.parse(value);
}
function distanceMeters(a, b) {
  const radians = degrees => degrees * Math.PI / 180;
  const latitudeDifference = radians(a.latitude - b.latitude);
  const longitudeDifference = radians(a.longitude - b.longitude);
  const chord = Math.sin(latitudeDifference / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitudeDifference / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, chord)));
}
function provenanceUrl(value) {
  if (typeof value !== 'string' || value.length > 2000 || /[?#]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null;
    // Normalize host/default port, dot segments and trailing slashes before duplicate detection.
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch { return null; }
}

function assessSources(policy, evidence, milliseconds) {
  const simulated = evidence.simulated === true;
  const sources = Array.isArray(evidence.sources) ? evidence.sources : [];
  const reasons = [];
  const identities = new Set();
  const provenances = new Set();
  const groups = new Set();
  let fresh = true;
  const add = (condition, message) => { if (condition) reasons.push(message); };
  const site = policy.siteLocation;
  const sitePolicyValid = policy.realEvidence?.version === '1.0' && policy.realEvidence.sourceType === 'observation'
    && policy.realEvidence.independenceBasis === 'adapter-declared' && validLocation(site)
    && inRange(site.maxDistanceMeters, 1, 100000) && inRange(site.maxAltitudeDifferenceMeters, 0, 10000);
  add(evidence.settlementReady === false || (!simulated && evidence.settlementReady !== true), 'El adaptador no declara la evidencia apta para liquidación.');
  if (!simulated) {
    // Never silently add policy terms to a historical agreement whose hash was consented.
    add(!sitePolicyValid, 'El acuerdo no define una política versionada de observaciones locales reales.');
    add(/forecast|prediction|pron[oó]stico/i.test(String(evidence.evidenceType ?? '')), 'Un pronóstico no sustituye las observaciones requeridas.');
  }
  for (const source of sources) {
    const start = reasons.length;
    add(!source || typeof source !== 'object' || Array.isArray(source), 'Una fuente requerida no tiene metadatos válidos.');
    add(simulated ? source?.simulated === false : source?.simulated !== false, 'No se permite mezclar fixtures con observaciones reales.');
    const hasTimestamp = typeof source?.observedAt === 'string' && source.observedAt.trim().length > 0;
    if (!simulated || hasTimestamp) {
      const sourceTime = simulated ? Date.parse(source.observedAt) : zonedObservationTimestamp(source?.observedAt);
      const sourceAge = hasTimestamp ? (milliseconds - sourceTime) / 1000 : NaN;
      const invalid = !Number.isFinite(sourceAge) || sourceAge > policy.maxAgeSeconds || sourceAge < -policy.maxClockSkewSeconds;
      add(invalid, 'Una fuente requerida no tiene una observación vigente con fecha válida y zona horaria explícita.');
      if (invalid) fresh = false;
    }
    add(source?.status === 'unavailable' || source?.status === 'error' || source?.valid === false || source?.settlementReady === false, 'Una fuente requerida no está disponible o veta la liquidación.');
    add(typeof source?.cloudPercent === 'number' && !inRange(source.cloudPercent, 0, policy.maxCloudPercent), 'Una fuente supera el umbral de nubosidad.');
    add(typeof source?.windKph === 'number' && !inRange(source.windKph, 0, policy.maxWindKph), 'Una fuente supera el umbral de viento.');
    add(typeof source?.humidityPercent === 'number' && !inRange(source.humidityPercent, 0, policy.maxHumidityPercent), 'Una fuente supera el umbral de humedad.');
    if (simulated) {
      const name = text(source?.name ?? source?.id ?? source?.provider, 200);
      if (name) groups.add(name);
      continue;
    }
    const id = sourceIdentity(source?.id);
    const provider = sourceIdentity(source?.provider);
    const group = sourceIdentity(source?.independenceGroup);
    const provenance = provenanceUrl(source?.provenance);
    add(!id || !provider || !group || !provenance, 'Una fuente real carece de identidad, procedencia HTTPS o grupo declarado por el adaptador.');
    add(Boolean(id) && identities.has(id), 'Hay un identificador de fuente real duplicado.');
    add(Boolean(provenance) && provenances.has(provenance), 'Hay una procedencia real duplicada aunque cambien sus etiquetas.');
    if (id) identities.add(id);
    if (provenance) provenances.add(provenance);
    add(source?.evidenceType !== 'observation' || /forecast|prediction|pron[oó]stico/i.test(String(source?.type ?? '')), 'Un pronóstico no sustituye las observaciones requeridas.');
    const location = source?.station ?? source?.location;
    add(!validLocation(location), 'Una fuente real carece de ubicación y altitud válidas.');
    if (sitePolicyValid && validLocation(location)) {
      add(distanceMeters(site, location) > site.maxDistanceMeters, 'Una observación está fuera del radio del sitio aprobado.');
      add(Math.abs(site.altitudeMeters - location.altitudeMeters) > site.maxAltitudeDifferenceMeters, 'Una observación está fuera de la tolerancia de altitud aprobada.');
    }
    // Every counted observation must expose the readings supporting its settlement decision.
    add(!inRange(source?.cloudPercent, 0, 100) || !inRange(source?.windKph, 0, 500) || !inRange(source?.humidityPercent, 0, 100), 'Una observación real no incluye las mediciones meteorológicas requeridas.');
    // Groups are adapter-declared lineage metadata, not a scientific proof of independence.
    if (reasons.length === start && group) groups.add(group);
  }
  add(groups.size < policy.minimumSources, simulated ? `Se requieren ${policy.minimumSources} fuentes de demo identificadas.` : `Se requieren ${policy.minimumSources} grupos de observación distintos declarados por el adaptador.`);
  return { sources, reasons, fresh, count: groups.size, valid: reasons.length === 0, simulated };
}

export function assessEvidence(agreement, evidence, now = new Date()) {
  const policy = agreement.policy;
  const reasons = [];
  const checks = [];
  const milliseconds = +now;
  const add = (condition, message) => { if (condition) reasons.push(message); };
  add(!evidence || typeof evidence !== 'object', 'Falta evidencia meteorológica.');
  if (evidence && typeof evidence === 'object') {
    const observedAt = evidence.simulated === true ? Date.parse(evidence.observedAt) : zonedObservationTimestamp(evidence.observedAt);
    const age = (milliseconds - observedAt) / 1000;
    add(!Number.isFinite(observedAt), 'La evidencia no incluye una fecha de observación válida.');
    add(Number.isFinite(age) && age > policy.maxAgeSeconds, 'La evidencia ha caducado.');
    add(Number.isFinite(age) && age < -policy.maxClockSkewSeconds, 'La evidencia está fechada en el futuro.');
    add(!inRange(evidence.cloudPercent, 0, 100), 'Falta una medición válida de nubosidad.');
    add(!inRange(evidence.windKph, 0, 500), 'Falta una medición válida de viento.');
    add(!inRange(evidence.humidityPercent, 0, 100), 'Falta una medición válida de humedad.');
    add(evidence.cloudPercent > policy.maxCloudPercent, `Nubosidad superior al ${policy.maxCloudPercent} %.`);
    add(evidence.windKph > policy.maxWindKph, `Viento superior a ${policy.maxWindKph} km/h.`);
    add(evidence.humidityPercent > policy.maxHumidityPercent, `Humedad superior al ${policy.maxHumidityPercent} %.`);
    add(evidence.conflict === true, 'Las fuentes meteorológicas discrepan.');
    add(evidence.complete === false || evidence.requiresReview === true || evidence.unavailable === true, 'La evidencia está incompleta o requiere revisión.');
    const sourceAssessment = assessSources(policy, evidence, milliseconds);
    const { sources } = sourceAssessment;
    reasons.push(...sourceAssessment.reasons);
    const clouds = sources.map(source => source?.cloudPercent).filter(value => inRange(value, 0, 100));
    add(clouds.length > 1 && Math.max(...clouds) - Math.min(...clouds) > policy.maxSourceCloudDifferencePercent, 'Las mediciones de nubosidad superan la discrepancia permitida.');
    checks.push(
      { id: 'cloud', label: 'Nubosidad', passed: inRange(evidence.cloudPercent, 0, policy.maxCloudPercent), actual: evidence.cloudPercent ?? null, threshold: `≤ ${policy.maxCloudPercent} %` },
      { id: 'wind', label: 'Viento', passed: inRange(evidence.windKph, 0, policy.maxWindKph), actual: evidence.windKph ?? null, threshold: `≤ ${policy.maxWindKph} km/h` },
      { id: 'humidity', label: 'Humedad', passed: inRange(evidence.humidityPercent, 0, policy.maxHumidityPercent), actual: evidence.humidityPercent ?? null, threshold: `≤ ${policy.maxHumidityPercent} %` },
      { id: 'freshness', label: 'Evidencia vigente', passed: sourceAssessment.fresh && Number.isFinite(age) && age <= policy.maxAgeSeconds && age >= -policy.maxClockSkewSeconds, actual: Number.isFinite(age) ? Math.max(0, Math.round(age)) : null, threshold: `≤ ${policy.maxAgeSeconds} s` },
      { id: 'sources', label: sourceAssessment.simulated ? 'Fuentes demo · sin independencia real' : 'Grupos declarados por adaptador', passed: sourceAssessment.valid, actual: sourceAssessment.count, threshold: `≥ ${policy.minimumSources}${sourceAssessment.simulated ? ' fixtures' : ' · declaración, sin verificación externa'}` },
      { id: 'agreement', label: 'Fuentes coherentes', passed: evidence.conflict !== true && !(clouds.length > 1 && Math.max(...clouds) - Math.min(...clouds) > policy.maxSourceCloudDifferencePercent), actual: evidence.conflict === true ? 'Discrepancia' : 'Sin discrepancia declarada', threshold: 'Sin conflicto' },
    );
  }
  add(Date.parse(agreement.expiresAt) <= milliseconds, 'El acuerdo ha vencido.');
  return {
    eligible: reasons.length === 0,
    decision: reasons.length === 0 ? 'PASS' : 'FAIL',
    reasons: [...new Set(reasons)],
    checks,
    evaluatedAt: now.toISOString(),
    evidenceHash: evidence ? hashObject(evidence) : null,
    agreementHash: agreement.hash,
    evidenceMode: evidence?.simulated === true ? 'simulated' : 'real',
    independenceBasis: evidence?.simulated === true ? 'demo-fixtures' : 'adapter-declared',
  };
}

function assertAgreement(agreement) {
  if (!agreement) fail(404, 'NOT_FOUND', 'Acuerdo no encontrado.');
  if (computeAgreementHash(agreement) !== agreement.hash || !verifyEventChain(agreement.events)) {
    fail(409, 'INTEGRITY_MISMATCH', 'El acuerdo o su registro ha cambiado. No se permite mover dinero.');
  }
  if (!isMinor(agreement.totalMinor) || agreement.totalMinor <= 0 || agreement.totalMinor > agreement.budgetMinor || agreement.allocations.reduce((sum, allocation) => sum + allocation.amountMinor, 0) !== agreement.totalMinor) {
    fail(409, 'INVALID_AMOUNT', 'Los importes del acuerdo no cuadran.');
  }
}
function assertConsent(agreement) {
  assertAgreement(agreement);
  if (agreement.consent?.agreementHash !== agreement.hash) fail(409, 'CONSENT_REQUIRED', 'Aprueba la versión exacta del acuerdo antes de continuar.');
}
function assertNotExpired(agreement, now) {
  if (Date.parse(agreement.expiresAt) <= +now) fail(409, 'AGREEMENT_EXPIRED', 'El acuerdo ha vencido. Crea una nueva negociación.');
}
function errorInfo(error) {
  // Adapter errors are not reflected verbatim: provider bodies can contain secrets.
  return { code: text(error?.code, 80) || 'PROVIDER_ERROR', message: 'El proveedor no ha confirmado la operación. Consulta el estado antes de reintentar.' };
}
function externalId(value, label) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.:-]{1,200}$/.test(value)) fail(502, 'INVALID_PROVIDER_RESPONSE', `El proveedor no devolvió un ${label} válido.`);
  return value;
}

/** All monetary decisions live here, outside the LLM. Adapters only execute scoped actions. */
export function createCore({ store, paymentAdapter, negotiate, evidenceProvider, now = () => new Date(), allowSandboxAutopilot = false }) {
  if (!store || !paymentAdapter) throw new TypeError('store y paymentAdapter son obligatorios.');
  const provider = paymentAdapter.mode ?? paymentAdapter.kind ?? 'demo';
  if (!['demo', 'paypal-sandbox'].includes(provider)) throw new Error('Solo se permite demo o PayPal Sandbox.');
  const queues = new Map();
  let autopilotCycle = null;
  const locked = async (id, operation) => {
    const prior = queues.get(id) ?? Promise.resolve();
    const task = prior.catch(() => {}).then(operation);
    queues.set(id, task);
    try { return await task; } finally { if (queues.get(id) === task) queues.delete(id); }
  };
  const get = id => { const agreement = store.get(id); assertAgreement(agreement); return agreement; };
  const save = agreement => store.save(agreement);
  const stamp = () => now().toISOString();
  const ensureProvider = agreement => {
    if (agreement.payment.provider !== provider) fail(409, 'PROVIDER_CHANGED', 'El entorno de pago ha cambiado. Crea un nuevo acuerdo.');
  };
  const guardAutopilot = (agreement, context) => {
    if (['ARMED', 'RUNNING'].includes(agreement.autopilot?.status) && context?.autopilot !== true) fail(409, 'AUTOPILOT_ACTIVE', 'La ejecución autónoma ya controla este acuerdo. Consulta su progreso.');
  };
  const isVoidPending = agreement => ['VOID_REQUESTED', 'VOID_PENDING'].includes(agreement.payment.status) || agreement.status === 'VOID_PENDING';
  const guardVoidPending = agreement => {
    if (isVoidPending(agreement)) fail(409, 'RECONCILE_REQUIRED', 'La anulación está pendiente de confirmación. Reconcilia su estado; no se reevaluará ni se enviará otra operación de pago.');
  };
  const refundStatus = agreement => ['REFUNDED', 'PARTIALLY_REFUNDED'].find(status => agreement.payment.status === status || agreement.payment.captureStatus === status);
  const guardRefunded = agreement => {
    if (refundStatus(agreement)) fail(409, 'CAPTURE_REFUNDED', 'La captura tiene un reembolso registrado. Se bloquean nuevas operaciones y desembolsos; revisa las obligaciones de los proveedores.');
  };
  const recordRefund = (agreement, incoming) => {
    // A stale COMPLETED response, or a partial refund observed after a full one,
    // cannot restore permission to spend. Supplier recovery is a separate review.
    const status = refundStatus(agreement) === 'REFUNDED' || incoming === 'REFUNDED' ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    agreement.payment.status = status;
    agreement.payment.captureStatus = status;
    agreement.payment.refundReviewRequired = true;
    agreement.payment.refundObservedAt ??= stamp();
    agreement.status = status;
  };
  const adapterCall = async (method, arguments_) => {
    if (typeof paymentAdapter[method] !== 'function') fail(503, 'CONNECTOR_UNAVAILABLE', 'La operación de pago no está disponible.');
    return publicData(await paymentAdapter[method](arguments_));
  };
  const failAutopilot = (id, error) => locked(id, () => {
    const agreement = store.get(id);
    if (!agreement || !['ARMED', 'RUNNING'].includes(agreement.autopilot?.status)) return;
    agreement.autopilot.status = 'FAILED';
    agreement.autopilot.failedAt = stamp();
    agreement.autopilot.lastError = { code: text(error?.code, 80) || 'AUTOPILOT_FAILED', message: 'La ejecución autónoma se ha detenido. Consulta el estado financiero antes de continuar.' };
    appendEvent(agreement, 'AUTOPILOT_FAILED', agreement.autopilot.lastError.message, stamp(), agreement.autopilot.lastError);
    save(agreement);
  });
  const applyReconciliation = (agreement, result) => {
    const payment = result.payment ?? result;
    const priorRefund = refundStatus(agreement);
    // Provider results cannot alter the approved terms, environment or operation keys.
    for (const key of ['orderId', 'authorizationId', 'captureId', 'authorizationStatus', 'captureStatus', 'authorizationExpiresAt']) {
      if (payment[key] !== undefined && payment[key] !== null) {
        if (key.endsWith('Id')) {
          externalId(payment[key], key);
          if (agreement.payment[key] && agreement.payment[key] !== payment[key]) fail(502, 'PAYMENT_REFERENCE_MISMATCH', 'La referencia del proveedor no coincide con el acuerdo.');
        }
        agreement.payment[key] = payment[key];
      }
    }
    const incoming = String(payment.status ?? '').toUpperCase();
    const incomingRefund = ['REFUNDED', 'PARTIALLY_REFUNDED'].find(status => incoming === status || payment.captureStatus === status);
    const final = ['COMPLETED', 'VOIDED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(agreement.payment.status);
    const voidPending = isVoidPending(agreement);
    if (incomingRefund || priorRefund) {
      if (!agreement.payment.captureId) fail(502, 'PAYMENT_REFERENCE_MISMATCH', 'Un reembolso requiere la referencia de una captura conocida.');
      recordRefund(agreement, priorRefund === 'REFUNDED' || incomingRefund === 'REFUNDED' ? 'REFUNDED' : 'PARTIALLY_REFUNDED');
    } else if (incoming === 'COMPLETED' && agreement.payment.captureId) {
      agreement.payment.status = 'COMPLETED'; agreement.status = 'CAPTURED';
    } else if (!final && incoming === 'VOIDED') {
      agreement.payment.status = 'VOIDED'; agreement.status = 'VOIDED';
      agreement.payment.voidedAt ??= stamp();
      agreement.payment.lastError = null;
    } else if (!final && voidPending) {
      // CREATED only says that an authorization still exists. It does not prove
      // that an uncertain cancellation failed or permit changing its decision to capture.
      agreement.payment.status = 'VOID_REQUESTED'; agreement.status = 'VOID_PENDING';
    } else if (!final && ['AUTHORIZED', 'CREATED'].includes(incoming) && agreement.payment.authorizationId && !agreement.operations.capture) {
      agreement.payment.status = 'AUTHORIZED'; agreement.status = 'AUTHORIZED';
    } else if (!final && ['DECLINED', 'DENIED', 'FAILED'].includes(incoming)) {
      agreement.payment.status = 'DECLINED'; agreement.status = 'CAPTURE_FAILED';
    }
    const payouts = result.payouts ?? payment.payouts;
    if (payouts) agreement.payment.payouts = payouts;
    if (agreement.payment.status === 'COMPLETED' && agreement.payment.payouts) agreement.status = payoutComplete(agreement.payment.payouts) ? 'SETTLED' : 'PAYOUTS_PENDING';
    agreement.payment.lastReconciledAt = stamp();
    return agreement;
  };

  const core = {
    provider,
    status() {
      return { ok: true, name: 'ASTERION', mode: provider, paymentProvider: provider, paymentMode: provider, sandboxOnly: true, sandboxAutopilotEnabled: provider === 'paypal-sandbox' && allowSandboxAutopilot === true, storage: 'sqlite', time: stamp(), agreements: store.list().length };
    },
    list(ownerId) { return store.list(ownerId).map(agreement => publicRecord(agreement)); },
    get(id) { return publicRecord(get(id)); },

    async negotiate(input = {}, context = {}) {
      const intent = text(input.intent);
      const budgetMinor = input.budgetMinor ?? 150000;
      const participants = input.participants ?? 2;
      if (!intent || intent.length < 8 || typeof input.intent !== 'string' || input.intent.length > 4000) fail(400, 'INVALID_INTENT', 'Describe una experiencia de entre 8 y 4000 caracteres.');
      if (!Number.isSafeInteger(budgetMinor) || budgetMinor < 100 || budgetMinor > MAX_BUDGET_MINOR) fail(400, 'INVALID_BUDGET', `El presupuesto debe ser un entero de céntimos entre 100 y ${MAX_BUDGET_MINOR}.`);
      if (!Number.isInteger(participants) || participants < 1 || participants > 12) fail(400, 'INVALID_PARTICIPANTS', 'El número de participantes debe estar entre 1 y 12.');
      const result = negotiate ? publicData(await negotiate({ intent, budgetMinor, participants })) : {};
      const allocations = result.allocations ?? clone(DEFAULT_ALLOCATIONS);
      if (!Array.isArray(allocations) || allocations.length < 2 || allocations.length > 10) fail(502, 'INVALID_OFFER', 'La negociación devolvió un reparto inválido.');
      const allocationIds = new Set();
      for (const allocation of allocations) {
        if (!allocation || !/^[a-zA-Z0-9_-]{1,50}$/.test(allocation.id ?? '') || allocationIds.has(allocation.id) || !isMinor(allocation.amountMinor) || allocation.amountMinor <= 0 || !text(allocation.name, 200) || !text(allocation.role, 50)) fail(502, 'INVALID_OFFER', 'La negociación devolvió una oferta inválida.');
        allocationIds.add(allocation.id);
      }
      const totalMinor = allocations.reduce((sum, allocation) => sum + allocation.amountMinor, 0);
      if (result.totalMinor !== undefined && result.totalMinor !== totalMinor) fail(502, 'OFFER_AMOUNT_MISMATCH', 'El total negociado no coincide con sus partidas.');
      if (totalMinor > budgetMinor) fail(422, 'BUDGET_EXCEEDED', 'El paquete disponible supera tu presupuesto. Aumenta el límite o ajusta la experiencia.');
      if (result.currency && result.currency !== 'EUR') fail(502, 'INVALID_CURRENCY', 'La demo solo admite acuerdos en EUR.');
      const createdAt = stamp();
      const agreement = {
        schemaVersion: 'asterion.agreement.v1',
        id: randomUUID(),
        ownerId: context.ownerId ?? null,
        status: 'NEGOTIATED',
        createdAt, updatedAt: createdAt,
        expiresAt: new Date(+now() + 2 * 60 * 60 * 1000).toISOString(),
        intent, budgetMinor, participants, totalMinor, currency: 'EUR',
        merchant: { id: 'canarias-organizer', name: 'ASTERION · organizador de la experiencia', model: 'single-merchant-package' },
        allocations,
        negotiation: Array.isArray(result.negotiation) ? result.negotiation : [],
        negotiationProvider: result.provider ?? 'demo',
        offers: Array.isArray(result.offers) ? result.offers : [],
        policy: clone(DEFAULT_POLICY),
        evidence: null,
        evaluation: null,
        consent: null,
        autopilot: null,
        payment: { provider, status: 'NOT_CREATED', orderId: null, authorizationId: null, captureId: null, payouts: null },
        operations: {},
        events: [],
      };
      agreement.hash = computeAgreementHash(agreement);
      appendEvent(agreement, 'AGREEMENT_NEGOTIATED', 'Agentes y proveedores acordaron un paquete sujeto a condiciones verificables.', createdAt, { agreementHash: agreement.hash, totalMinor, negotiationProvider: agreement.negotiationProvider });
      return publicRecord(store.insert(agreement));
    },

    async consent(id, input = {}) {
      return locked(id, () => {
        const agreement = get(id);
        ensureProvider(agreement);
        assertNotExpired(agreement, now());
        if (input.agreementHash !== agreement.hash) fail(409, 'HASH_MISMATCH', 'La aprobación no corresponde a esta versión del acuerdo.');
        if (agreement.consent?.agreementHash === agreement.hash) return publicRecord(agreement);
        if (agreement.payment.status !== 'NOT_CREATED') fail(409, 'INVALID_STATE', 'No se puede modificar el consentimiento de un pago iniciado.');
        agreement.consent = { agreementHash: agreement.hash, acceptedAt: stamp(), maxAmountMinor: agreement.totalMinor, currency: agreement.currency, provider };
        agreement.status = 'CONSENTED';
        appendEvent(agreement, 'CONSENT_RECORDED', 'El usuario aprobó el importe, las condiciones y la versión exacta del acuerdo.', stamp(), { agreementHash: agreement.hash });
        return publicRecord(save(agreement));
      });
    },

    async createOrder(id) {
      return locked(id, async () => {
        let agreement = get(id);
        assertConsent(agreement); ensureProvider(agreement); assertNotExpired(agreement, now());
        guardRefunded(agreement);
        if (agreement.payment.orderId) return publicRecord(agreement);
        if (agreement.payment.authorizationId || agreement.payment.captureId) fail(409, 'INVALID_STATE', 'Ya existe una operación de pago.');
        agreement.operations.order ??= randomUUID();
        agreement.payment.status = 'ORDER_REQUESTED';
        appendEvent(agreement, 'ORDER_REQUESTED', 'Creación de una orden PayPal con intención AUTHORIZE.', stamp());
        agreement = save(agreement);
        try {
          const result = await adapterCall('createOrder', { agreement: clone(agreement), idempotencyKey: agreement.operations.order });
          agreement.payment.orderId = externalId(result.orderId ?? result.id, 'order ID');
          agreement.payment.status = result.status ?? 'CREATED';
          if (result.approvalUrl) {
            const url = new URL(result.approvalUrl);
            if (provider === 'paypal-sandbox' && (url.protocol !== 'https:' || !['www.sandbox.paypal.com', 'sandbox.paypal.com'].includes(url.hostname))) fail(502, 'INVALID_APPROVAL_URL', 'La aprobación debe realizarse en PayPal Sandbox.');
            agreement.payment.approvalUrl = result.approvalUrl;
          }
          agreement.status = 'ORDER_CREATED';
          agreement.payment.lastError = null;
          appendEvent(agreement, 'ORDER_CREATED', provider === 'demo' ? 'Orden de demostración creada; no mueve dinero real.' : 'Orden creada en PayPal Sandbox; pendiente de aprobación del comprador.', stamp(), { orderId: agreement.payment.orderId });
          return publicRecord(save(agreement));
        } catch (error) {
          agreement.payment.lastError = errorInfo(error);
          appendEvent(agreement, 'ORDER_UNCONFIRMED', 'No se ha confirmado la creación de la orden.', stamp(), errorInfo(error));
          save(agreement);
          throw error instanceof DomainError ? error : new DomainError(502, 'PAYMENT_ORDER_FAILED', 'No se pudo confirmar la orden de pago.');
        }
      });
    },

    async authorize(id, input = {}) {
      return locked(id, async () => {
        let agreement = get(id);
        assertConsent(agreement); ensureProvider(agreement); assertNotExpired(agreement, now());
        guardRefunded(agreement);
        if (input.agreementHash !== agreement.hash) fail(409, 'HASH_MISMATCH', 'La autorización requiere el hash exacto aprobado.');
        if (input.orderId && input.orderId !== agreement.payment.orderId) fail(409, 'ORDER_MISMATCH', 'La orden no pertenece a este acuerdo.');
        if (agreement.payment.authorizationId) return publicRecord(agreement);
        if (!agreement.payment.orderId) fail(409, 'ORDER_REQUIRED', 'Crea primero la orden de pago.');
        agreement.operations.authorize ??= randomUUID();
        agreement.payment.status = 'AUTHORIZATION_REQUESTED';
        appendEvent(agreement, 'AUTHORIZATION_REQUESTED', 'Solicitud de autorización del importe aprobado.', stamp());
        agreement = save(agreement);
        try {
          const result = await adapterCall('authorize', { agreement: clone(agreement), orderId: agreement.payment.orderId, idempotencyKey: agreement.operations.authorize });
          if (!['CREATED', 'AUTHORIZED'].includes(String(result.status ?? '').toUpperCase())) fail(502, 'AUTHORIZATION_NOT_READY', 'La autorización no está lista para capturar.');
          agreement.payment.authorizationId = externalId(result.authorizationId ?? result.id, 'authorization ID');
          agreement.payment.authorizationStatus = result.status ?? 'CREATED';
          agreement.payment.status = 'AUTHORIZED';
          agreement.payment.authorizedAt = stamp();
          agreement.payment.authorizationExpiresAt = result.expirationTime ?? result.expiresAt ?? null;
          agreement.payment.lastError = null;
          agreement.status = 'AUTHORIZED';
          appendEvent(agreement, 'PAYMENT_AUTHORIZED', 'Importe autorizado. Todavía no se ha capturado el pago.', stamp(), { authorizationId: agreement.payment.authorizationId });
          return publicRecord(save(agreement));
        } catch (error) {
          agreement.payment.lastError = errorInfo(error);
          appendEvent(agreement, 'AUTHORIZATION_UNCONFIRMED', 'No se ha confirmado la autorización. No se permite capturar.', stamp(), errorInfo(error));
          save(agreement);
          throw error instanceof DomainError ? error : new DomainError(502, 'PAYMENT_AUTHORIZATION_FAILED', 'PayPal no ha confirmado la autorización. Aprueba la orden y consulta su estado.');
        }
      });
    },

    async evaluate(id, input = {}, context = {}) {
      return locked(id, async () => {
        const agreement = get(id);
        assertConsent(agreement); ensureProvider(agreement);
        guardAutopilot(agreement, context);
        guardVoidPending(agreement);
        guardRefunded(agreement);
        if (!agreement.payment.authorizationId || ['COMPLETED', 'VOIDED', 'CAPTURE_PENDING', 'CAPTURE_REQUESTED'].includes(agreement.payment.status)) fail(409, 'AUTHORIZATION_REQUIRED', 'Se requiere una autorización activa sin capturar.');
        const scenario = input.scenario ?? 'clear';
        if (!['clear', 'cloudy', 'stale', 'conflict', 'live'].includes(scenario)) fail(400, 'INVALID_SCENARIO', 'Escenario meteorológico desconocido.');
        try {
          agreement.evidence = publicData(await evidenceProvider({ agreement: clone(agreement), scenario }));
        } catch {
          agreement.evidence = { provider: 'unavailable', scenario, observedAt: null, sources: [], unavailable: true };
        }
        agreement.evaluation = assessEvidence(agreement, agreement.evidence, now());
        agreement.status = agreement.evaluation.eligible ? 'CONDITION_MET' : 'CONDITION_FAILED';
        appendEvent(agreement, agreement.evaluation.eligible ? 'CONDITION_MET' : 'CONDITION_FAILED', agreement.evaluation.eligible ? 'La evidencia satisface todos los umbrales aprobados.' : 'El motor de políticas bloquea el cobro.', stamp(), { ...agreement.evaluation, evidenceProvider: agreement.evidence?.provider, scenario });
        return publicRecord(save(agreement));
      });
    },

    async execute(id, _input = {}, context = {}) {
      return locked(id, async () => {
        let agreement = get(id);
        assertConsent(agreement); ensureProvider(agreement);
        guardAutopilot(agreement, context);
        guardRefunded(agreement);
        if (['COMPLETED', 'VOIDED'].includes(agreement.payment.status)) return publicRecord(agreement);
        guardVoidPending(agreement);
        if (['CAPTURE_PENDING', 'CAPTURE_REQUESTED'].includes(agreement.payment.status)) fail(409, 'RECONCILE_REQUIRED', 'La captura está pendiente. Reconcilia el estado; no se enviará otro cobro.');
        if (!agreement.payment.authorizationId) fail(409, 'AUTHORIZATION_REQUIRED', 'Autoriza el pago antes de ejecutarlo.');
        if (!agreement.evaluation) fail(409, 'EVIDENCE_REQUIRED', 'Evalúa primero la evidencia meteorológica.');
        if (agreement.evaluation.evidenceHash !== (agreement.evidence ? hashObject(agreement.evidence) : null)) fail(409, 'EVIDENCE_MISMATCH', 'La evidencia ha cambiado desde su evaluación. Evalúa de nuevo antes de ejecutar.');
        // Never rely on a cached green badge: evidence may have expired since evaluation.
        agreement.evaluation = assessEvidence(agreement, agreement.evidence, now());
        if (agreement.payment.authorizationExpiresAt && Date.parse(agreement.payment.authorizationExpiresAt) <= +now()) {
          agreement.evaluation.eligible = false;
          agreement.evaluation.decision = 'FAIL';
          agreement.evaluation.reasons.push('La autorización de pago ha vencido.');
        }
        const capture = agreement.evaluation.eligible;
        const operation = capture ? 'capture' : 'void';
        agreement.operations[operation] ??= randomUUID();
        agreement.status = capture ? 'CAPTURE_PENDING' : 'VOID_PENDING';
        agreement.payment.status = capture ? 'CAPTURE_REQUESTED' : 'VOID_REQUESTED';
        appendEvent(agreement, capture ? 'CAPTURE_REQUESTED' : 'VOID_REQUESTED', capture ? 'La política permite capturar el importe exacto aprobado.' : 'Condición incumplida: se solicita anular la retención sin cobrar.', stamp(), { agreementHash: agreement.hash, evidenceHash: agreement.evaluation.evidenceHash, reasons: agreement.evaluation.reasons });
        agreement = save(agreement);
        try {
          const result = await adapterCall(operation, { agreement: clone(agreement), authorizationId: agreement.payment.authorizationId, amountMinor: agreement.totalMinor, currency: agreement.currency, idempotencyKey: agreement.operations[operation] });
          const resultStatus = String(result.status ?? '').toUpperCase();
          if (capture) {
            agreement.payment.captureId = externalId(result.captureId ?? result.id, 'capture ID');
            agreement.payment.captureStatus = resultStatus;
            if (['REFUNDED', 'PARTIALLY_REFUNDED'].includes(resultStatus)) {
              recordRefund(agreement, resultStatus);
              appendEvent(agreement, 'CAPTURE_REFUND_DETECTED', 'El proveedor informa un reembolso de la captura. Los desembolsos y nuevas ejecuciones quedan bloqueados.', stamp(), { captureId: agreement.payment.captureId, status: resultStatus });
            } else {
              agreement.payment.status = resultStatus === 'COMPLETED' ? 'COMPLETED' : resultStatus === 'DECLINED' || resultStatus === 'DENIED' || resultStatus === 'FAILED' ? 'DECLINED' : 'CAPTURE_PENDING';
              agreement.status = agreement.payment.status === 'COMPLETED' ? 'CAPTURED' : agreement.payment.status === 'DECLINED' ? 'CAPTURE_FAILED' : 'CAPTURE_PENDING';
              appendEvent(agreement, agreement.payment.status === 'COMPLETED' ? 'PAYMENT_CAPTURED' : agreement.payment.status === 'DECLINED' ? 'CAPTURE_DECLINED' : 'CAPTURE_PENDING', agreement.payment.status === 'COMPLETED' ? 'Captura completada. Los pagos a proveedores siguen siendo operaciones separadas.' : 'La captura no está completada. Los desembolsos permanecen bloqueados.', stamp(), { captureId: agreement.payment.captureId, status: resultStatus });
            }
          } else {
            if (resultStatus !== 'VOIDED' && resultStatus !== 'COMPLETED') fail(502, 'VOID_UNCONFIRMED', 'El proveedor no confirmó la anulación.');
            agreement.payment.status = 'VOIDED';
            agreement.status = 'VOIDED';
            agreement.payment.voidedAt = stamp();
            appendEvent(agreement, 'AUTHORIZATION_VOIDED', 'Autorización anulada sin captura; no es un reembolso.', stamp(), { authorizationId: agreement.payment.authorizationId });
          }
          agreement.payment.lastError = null;
          return publicRecord(save(agreement));
        } catch (error) {
          // Ambiguous capture responses remain pending until reconciliation; never mark failed and charge again.
          agreement.payment.lastError = errorInfo(error);
          if (capture) { agreement.payment.status = 'CAPTURE_PENDING'; agreement.status = 'CAPTURE_PENDING'; }
          else { agreement.payment.status = 'VOID_REQUESTED'; agreement.status = 'VOID_PENDING'; }
          appendEvent(agreement, capture ? 'CAPTURE_UNCONFIRMED' : 'VOID_UNCONFIRMED', 'La respuesta del proveedor es incierta. Es necesario reconciliar el estado.', stamp(), errorInfo(error));
          agreement = save(agreement);
          if (capture) {
            // A lost write response can still mean success. Query before asking for intervention.
            // Never retry the POST with a new key, and never treat a failed GET as a failed payment.
            try {
              const recovered = await adapterCall('reconcile', { agreement: clone(agreement) });
              applyReconciliation(agreement, recovered);
              if (agreement.payment.status === 'COMPLETED') {
                agreement.payment.lastError = null;
                appendEvent(agreement, 'CAPTURE_RECOVERED', 'La consulta al proveedor confirmó una captura cuya respuesta no había llegado. No se repitió el cobro.', stamp(), { captureId: agreement.payment.captureId });
                return publicRecord(save(agreement));
              }
              appendEvent(agreement, 'CAPTURE_RECONCILIATION_PENDING', 'La consulta aún no confirma el cobro. Se conserva el estado financiero pendiente.', stamp(), { status: agreement.payment.status, captureId: agreement.payment.captureId });
              agreement = save(agreement);
            } catch { /* Keep the persisted pending state; a read error is not a financial failure. */ }
          }
          throw error instanceof DomainError ? error : new DomainError(502, 'PAYMENT_UNCONFIRMED', 'No se confirmó la operación. Reconcilia el estado antes de continuar.');
        }
      });
    },

    async payouts(id, _input = {}, context = {}) {
      return locked(id, async () => {
        let agreement = get(id);
        assertConsent(agreement); ensureProvider(agreement);
        guardAutopilot(agreement, context);
        guardRefunded(agreement);
        if (agreement.payment.status !== 'COMPLETED' || !agreement.payment.captureId) fail(409, 'CAPTURE_NOT_COMPLETED', 'Los desembolsos requieren una captura COMPLETED.');
        if (agreement.payment.payouts) return publicRecord(agreement);
        if (agreement.operations.payoutsAttempted) fail(409, 'RECONCILE_REQUIRED', 'Ya se solicitó este lote. Reconcilia su estado antes de continuar.');
        agreement.operations.payouts ??= randomUUID();
        agreement.operations.payoutsAttempted = true;
        agreement.status = 'PAYOUTS_PENDING';
        appendEvent(agreement, 'PAYOUTS_REQUESTED', 'Se solicitan pagos separados desde el saldo prefinanciado del organizador.', stamp());
        agreement = save(agreement);
        try {
          const result = await adapterCall('payouts', { agreement: clone(agreement), captureId: agreement.payment.captureId, idempotencyKey: agreement.operations.payouts });
          agreement.payment.payouts = result;
          agreement.status = payoutComplete(result) ? 'SETTLED' : 'PAYOUTS_PENDING';
          appendEvent(agreement, agreement.status === 'SETTLED' ? 'PAYOUTS_COMPLETED' : 'PAYOUTS_PENDING', agreement.status === 'SETTLED' ? 'Los tres pagos a proveedores se han confirmado individualmente.' : 'Lote recibido. Se esperan los estados individuales de los proveedores.', stamp(), result);
          return publicRecord(save(agreement));
        } catch (error) {
          agreement.payment.lastError = errorInfo(error);
          appendEvent(agreement, 'PAYOUTS_UNCONFIRMED', 'No se confirmó el lote de pagos. Los importes no se vuelven a enviar automáticamente.', stamp(), errorInfo(error));
          save(agreement);
          throw error instanceof DomainError ? error : new DomainError(502, 'PAYOUTS_UNCONFIRMED', 'No se ha confirmado el desembolso. Reconcilia el lote para evitar duplicados.');
        }
      });
    },

    async reconcile(id) {
      return locked(id, async () => {
        let agreement = get(id);
        assertConsent(agreement); ensureProvider(agreement);
        if (!agreement.payment.orderId) fail(409, 'ORDER_REQUIRED', 'No existe una orden que reconciliar.');
        const result = await adapterCall('reconcile', { agreement: clone(agreement) });
        applyReconciliation(agreement, result);
        appendEvent(agreement, 'PAYMENT_RECONCILED', 'Estado contrastado con el proveedor de pagos.', stamp(), { status: agreement.payment.status, payouts: agreement.payment.payouts });
        return publicRecord(save(agreement));
      });
    },

    async armAutopilot(id, input = {}) {
      return locked(id, () => {
        const agreement = get(id);
        assertConsent(agreement); ensureProvider(agreement); assertNotExpired(agreement, now());
        guardRefunded(agreement);
        const scenario = input.scenario ?? 'clear';
        if (!['clear', 'cloudy', 'stale', 'conflict'].includes(scenario)) fail(400, 'INVALID_SCENARIO', 'Selecciona un escenario meteorológico de demostración válido.');
        if (provider === 'paypal-sandbox' && (!allowSandboxAutopilot || input.confirmSandboxAutopilot !== true || input.agreementHash !== agreement.hash)) {
          fail(403, 'SANDBOX_AUTOPILOT_DISABLED', 'La ejecución autónoma Sandbox requiere habilitación privada del operador y aprobación explícita del acuerdo.');
        }
        if (agreement.autopilot) {
          if (['ARMED', 'RUNNING'].includes(agreement.autopilot.status) && agreement.autopilot.scenario === scenario) return publicRecord(agreement);
          fail(409, 'AUTOPILOT_ALREADY_ARMED', 'Este acuerdo ya tiene una ejecución autónoma. No se creará otra.');
        }
        if (agreement.status !== 'AUTHORIZED' || agreement.payment.status !== 'AUTHORIZED' || !agreement.payment.authorizationId) fail(409, 'AUTHORIZATION_REQUIRED', 'Autoriza primero el acuerdo antes de armar su ejecución autónoma.');
        agreement.autopilot = {
          id: randomUUID(), status: 'ARMED', scenario,
          armedAt: stamp(), runAt: new Date(+now() + 3000).toISOString(),
          agreementHash: agreement.hash, attempts: 0,
          notice: 'El servidor evaluará la evidencia y ejecutará captura o anulación sin otro clic. Si captura, solicitará los desembolsos separados.',
        };
        appendEvent(agreement, 'AUTOPILOT_ARMED', 'Ejecución autónoma armada por el usuario. El trabajo queda persistido antes de responder.', stamp(), { jobId: agreement.autopilot.id, scenario, runAt: agreement.autopilot.runAt, agreementHash: agreement.hash });
        return publicRecord(save(agreement));
      });
    },

    /** The scheduler reads durable jobs on every pass, including after process restart. */
    runDueAutopilots() {
      if (autopilotCycle) return autopilotCycle;
      autopilotCycle = (async () => {
        const due = typeof store.dueAutopilots === 'function' ? store.dueAutopilots(stamp()) : store.list().filter(agreement => ['ARMED', 'RUNNING'].includes(agreement.autopilot?.status) && Date.parse(agreement.autopilot.runAt) <= +now());
        let processed = 0;
        for (const candidate of due) {
          let claimed;
          try { claimed = await locked(candidate.id, () => {
            const agreement = get(candidate.id);
            const job = agreement.autopilot;
            if (!job || !['ARMED', 'RUNNING'].includes(job.status) || Date.parse(job.runAt) > +now()) return null;
            assertConsent(agreement); ensureProvider(agreement);
            guardRefunded(agreement);
            if (job.agreementHash !== agreement.hash) fail(409, 'HASH_MISMATCH', 'La delegación no corresponde al acuerdo aprobado.');
            const firstStart = job.status === 'ARMED';
            job.status = 'RUNNING';
            job.startedAt ??= stamp();
            job.attempts++;
            appendEvent(agreement, firstStart ? 'AUTOPILOT_STARTED' : 'AUTOPILOT_RESUMED', firstStart ? 'El servidor inicia la evaluación y ejecución sin intervención del usuario.' : 'El servidor retoma el trabajo persistido desde su estado financiero confirmado.', stamp(), { jobId: job.id, attempt: job.attempts });
            return save(agreement);
          }); } catch (error) { await failAutopilot(candidate.id, error); continue; }
          if (!claimed) continue;
          processed++;
          try {
            let agreement = claimed;
            if (agreement.payment.status === 'AUTHORIZED') {
              agreement = await core.evaluate(agreement.id, { scenario: agreement.autopilot.scenario }, { autopilot: true });
              agreement = await core.execute(agreement.id, {}, { autopilot: true });
            } else if (['CAPTURE_REQUESTED', 'CAPTURE_PENDING', 'VOID_REQUESTED'].includes(agreement.payment.status)) {
              agreement = await core.reconcile(agreement.id);
            }
            if (agreement.payment.status === 'COMPLETED') {
              if (agreement.payment.payouts && agreement.status !== 'SETTLED') agreement = await core.reconcile(agreement.id);
              if (!agreement.payment.payouts) agreement = await core.payouts(agreement.id, {}, { autopilot: true });
            }
            const terminal = ['SETTLED', 'VOIDED'].includes(agreement.status);
            const waiting = ['CAPTURE_PENDING', 'PAYOUTS_PENDING', 'VOID_PENDING'].includes(agreement.status);
            if (!terminal && (!waiting || agreement.autopilot.attempts >= 30)) fail(409, 'AUTOPILOT_NEEDS_REVIEW', 'La operación requiere revisión del estado del proveedor.');
            await locked(agreement.id, () => {
              const latest = get(agreement.id);
              if (!['ARMED', 'RUNNING'].includes(latest.autopilot?.status)) return;
              if (terminal) {
                latest.autopilot.status = 'COMPLETED';
                latest.autopilot.completedAt = stamp();
                latest.autopilot.outcome = latest.status;
                appendEvent(latest, 'AUTOPILOT_COMPLETED', latest.status === 'VOIDED' ? 'El servidor anuló la autorización porque no se cumplieron las condiciones. No hubo captura.' : 'El servidor completó la captura y los tres desembolsos separados sin otro clic.', stamp(), { jobId: latest.autopilot.id, outcome: latest.status });
              } else {
                latest.autopilot.runAt = new Date(+now() + 2000).toISOString();
                latest.autopilot.waitingFor = 'provider-confirmation';
                appendEvent(latest, 'AUTOPILOT_WAITING', 'Se espera confirmación del proveedor. No se repetirá el cobro.', stamp(), { jobId: latest.autopilot.id, runAt: latest.autopilot.runAt });
              }
              save(latest);
            });
          } catch (error) {
            await failAutopilot(candidate.id, error);
          }
        }
        return { processed };
      })().finally(() => { autopilotCycle = null; });
      return autopilotCycle;
    },

    waitForAutopilotIdle() { return autopilotCycle ?? Promise.resolve(); },

    receipt(id) {
      const agreement = get(id);
      return publicRecord({
        schemaVersion: 'asterion.receipt.v1',
        exportedAt: stamp(),
        environment: provider,
        notice: provider === 'demo' ? 'Demostración local. No es una transacción financiera real.' : 'PayPal Sandbox. Dinero y cuentas de prueba.',
        settlementModel: 'Una captura al organizador y desembolsos posteriores separados desde su saldo. Sin atomicidad entre proveedores.',
        integrity: { agreementHashValid: computeAgreementHash(agreement) === agreement.hash, eventChainValid: verifyEventChain(agreement.events), eventCount: agreement.events.length, lastEventHash: agreement.events.at(-1)?.hash },
        agreement: agreementTerms(agreement),
        agreementHash: agreement.hash,
        consent: agreement.consent,
        autopilot: agreement.autopilot,
        status: agreement.status,
        evidence: agreement.evidence,
        evaluation: agreement.evaluation,
        payment: agreement.payment,
        events: agreement.events,
      });
    },

    async webhook({ headers, event }) {
      if (provider !== 'paypal-sandbox') fail(400, 'WEBHOOK_DISABLED', 'Los webhooks solo se procesan en modo PayPal Sandbox.');
      if (!event || typeof event.id !== 'string' || typeof event.event_type !== 'string') fail(400, 'INVALID_WEBHOOK', 'Evento de webhook inválido.');
      const verified = await paymentAdapter.verifyWebhook?.({ headers, event, webhookEvent: event });
      if (verified !== true && verified?.verification_status !== 'SUCCESS' && verified?.valid !== true) fail(401, 'INVALID_WEBHOOK_SIGNATURE', 'Firma del webhook inválida.');
      // The webhook is only a reconciliation hint; payloads never directly authorize money movement.
      const resource = event.resource ?? {};
      const ids = new Set([resource.id, resource.supplementary_data?.related_ids?.order_id, resource.supplementary_data?.related_ids?.authorization_id].filter(Boolean));
      const agreements = store.list().filter(agreement => [agreement.payment.orderId, agreement.payment.authorizationId, agreement.payment.captureId, agreement.payment.payouts?.batchId, agreement.payment.payouts?.payout_batch_id].some(id => id && ids.has(id)));
      for (const agreement of agreements) await core.reconcile(agreement.id);
      const firstSeen = store.recordWebhook({ id: event.id, event_type: event.event_type, processedAt: stamp(), matchedAgreements: agreements.map(agreement => agreement.id) });
      return { received: true, duplicate: !firstSeen, reconciled: agreements.length };
    },
  };
  return core;
}

function payoutComplete(result) {
  const items = result?.items;
  // A successful batch alone is not proof that each recipient received its payment.
  return Array.isArray(items) && items.length === 3 && items.every(item => ['SUCCESS', 'SUCCEEDED', 'COMPLETED'].includes(String(item.status).toUpperCase()));
}
