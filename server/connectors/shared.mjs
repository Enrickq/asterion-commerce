import { createHash } from 'node:crypto';

export function connectorError(code, message, status = 502, details) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.statusCode = status;
  if (details) error.details = details;
  return error;
}

export const hash = (value) => createHash('sha256').update(String(value)).digest('hex');
export const stableRequestId = (operation, value) => `astra-${hash(`${operation}:${value}`).slice(0, 30)}`;

export function moneyValue(amountMinor, currency = 'EUR') {
  if (currency !== 'EUR' || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > 100_000_000) {
    throw connectorError('INVALID_AMOUNT', 'Se requiere un importe entero positivo en céntimos de EUR.', 400);
  }
  return `${Math.floor(amountMinor / 100)}.${String(amountMinor % 100).padStart(2, '0')}`;
}

export async function fetchJson(fetchImpl, url, options = {}, provider = 'Proveedor', timeoutMs = 15_000) {
  let response;
  try {
    response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw connectorError('PROVIDER_UNAVAILABLE', `${provider}: conexión no disponible o tiempo de espera agotado.`);
  }
  let data = {};
  try { data = await response.json(); } catch {
    if (response.status !== 204) throw connectorError('INVALID_PROVIDER_RESPONSE', `${provider}: respuesta no válida.`);
  }
  if (!response.ok) {
    const providerCode = typeof data.name === 'string' && /^[A-Z0-9_]{1,80}$/.test(data.name) ? data.name : undefined;
    const debugId = typeof data.debug_id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(data.debug_id) ? data.debug_id : undefined;
    throw connectorError('PROVIDER_REJECTED', `${provider}: solicitud rechazada (HTTP ${response.status}).`, 502,
      { httpStatus: response.status, ...(providerCode && { providerCode }), ...(debugId && { debugId }) });
  }
  return data;
}
