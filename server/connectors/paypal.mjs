import { connectorError, fetchJson, hash, moneyValue, stableRequestId } from './shared.mjs';

// Live payments are deliberately unsupported. Credentials never leave this module.
export const PAYPAL_SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';

function requireId(value, name) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{3,150}$/.test(value)) {
    throw connectorError('INVALID_PAYMENT_ID', `${name} no válido.`, 400);
  }
  return encodeURIComponent(value);
}

function requestKey(operation, args, fallback) {
  return stableRequestId(operation, args.requestId || args.idempotencyKey || fallback);
}

function agreementId(agreement) {
  if (!agreement || typeof agreement.id !== 'string' || !agreement.id) throw connectorError('INVALID_AGREEMENT', 'Acuerdo no válido.', 400);
  return agreement.id;
}

const AUTHORIZATION_STATUSES = new Set(['CREATED', 'CAPTURED', 'DENIED', 'PARTIALLY_CAPTURED', 'VOIDED', 'PENDING']);
const CAPTURE_STATUSES = new Set(['COMPLETED', 'DECLINED', 'DENIED', 'PARTIALLY_REFUNDED', 'PENDING', 'REFUNDED', 'FAILED']);

function providerId(value, expected) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{3,150}$/.test(value)) throw connectorError('INVALID_PROVIDER_RESPONSE', 'PayPal Sandbox devolvió una referencia no válida.');
  if (expected && value !== expected) throw connectorError('PAYMENT_REFERENCE_MISMATCH', 'La referencia de PayPal no coincide con el acuerdo.');
  return value;
}

function verifiedAmount(amount, expectedMinor, code = 'PAYMENT_AMOUNT_MISMATCH') {
  if (amount?.currency_code !== 'EUR' || typeof amount.value !== 'string' || !/^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(amount.value)) {
    throw connectorError(code, 'PayPal no confirmó un importe válido en EUR.');
  }
  const [whole, fraction = ''] = amount.value.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0 || minor > 100_000_000 || (expectedMinor !== undefined && minor !== expectedMinor)) {
    throw connectorError(code, 'El importe de PayPal no coincide con el importe acordado.');
  }
  return minor;
}

function verifiedAuthorization(authorization, agreement, expectedId) {
  const authorizationId = providerId(authorization?.id, expectedId);
  if (!AUTHORIZATION_STATUSES.has(authorization.status)) throw connectorError('INVALID_PROVIDER_RESPONSE', 'PayPal no confirmó un estado de autorización válido.');
  const amountMinor = verifiedAmount(authorization.amount, agreement?.totalMinor, 'AUTHORIZATION_AMOUNT_MISMATCH');
  if (authorization.expiration_time !== undefined && !Number.isFinite(Date.parse(authorization.expiration_time))) throw connectorError('INVALID_PROVIDER_RESPONSE', 'PayPal devolvió una fecha de expiración no válida.');
  return { authorizationId, status: authorization.status, authorizationStatus: authorization.status, amountMinor, currency: 'EUR',
    ...(authorization.expiration_time && { expirationTime: authorization.expiration_time, authorizationExpiresAt: authorization.expiration_time }) };
}

function verifiedCapture(capture, agreement, refs, expectedId) {
  const captureId = providerId(capture?.id, expectedId);
  if (!CAPTURE_STATUSES.has(capture.status)) throw connectorError('INVALID_PROVIDER_RESPONSE', 'PayPal no confirmó un estado de captura válido.');
  const amountMinor = verifiedAmount(capture.amount, agreement?.totalMinor, 'CAPTURE_AMOUNT_MISMATCH');
  const related = capture.supplementary_data?.related_ids ?? {};
  if ((refs.orderId && related.order_id && related.order_id !== refs.orderId) || (refs.authorizationId && related.authorization_id && related.authorization_id !== refs.authorizationId)) {
    throw connectorError('PAYMENT_REFERENCE_MISMATCH', 'La captura de PayPal pertenece a otra orden o autorización.');
  }
  return { captureId, status: capture.status, captureStatus: capture.status, amountMinor, currency: 'EUR',
    ...(refs.orderId && { orderId: refs.orderId }), ...(refs.authorizationId && { authorizationId: refs.authorizationId }) };
}

function verifiedUnit(order, orderId, agreement) {
  providerId(order?.id, orderId);
  if (order.intent !== undefined && order.intent !== 'AUTHORIZE') throw connectorError('PAYMENT_REFERENCE_MISMATCH', 'La orden no corresponde al flujo de autorización acordado.');
  if (!Array.isArray(order.purchase_units) || order.purchase_units.length !== 1) throw connectorError('INVALID_PROVIDER_RESPONSE', 'Se requiere una única unidad de compra en la orden PayPal.');
  const unit = order.purchase_units[0];
  if (agreement && unit.reference_id !== undefined && unit.reference_id !== agreement.id) throw connectorError('PAYMENT_REFERENCE_MISMATCH', 'La unidad de compra no corresponde al acuerdo.');
  if (unit.amount !== undefined) verifiedAmount(unit.amount, agreement?.totalMinor);
  return unit;
}

function paymentRefs(agreement) {
  return { ...(agreement?.payments || {}), ...(agreement?.payment || {}),
    orderId: agreement?.payment?.orderId || agreement?.payments?.orderId || agreement?.orderId,
    authorizationId: agreement?.payment?.authorizationId || agreement?.payments?.authorizationId || agreement?.authorizationId,
    captureId: agreement?.payment?.captureId || agreement?.payments?.captureId || agreement?.captureId,
    batchId: agreement?.payment?.payouts?.batchId || agreement?.payouts?.batchId || agreement?.payment?.batchId || agreement?.batchId };
}

function payoutAllocations(agreement) {
  const allocations = agreement?.allocations;
  if (!Array.isArray(allocations) || !allocations.length) throw connectorError('INVALID_ALLOCATIONS', 'El acuerdo no contiene un reparto válido.', 400);
  const ids = new Set();
  let total = 0;
  for (const allocation of allocations) {
    if (typeof allocation.id !== 'string' || ids.has(allocation.id)) throw connectorError('INVALID_ALLOCATIONS', 'Identificadores de reparto no válidos.', 400);
    ids.add(allocation.id);
    moneyValue(allocation.amountMinor, agreement.currency || 'EUR');
    total += allocation.amountMinor;
  }
  if (total !== agreement.totalMinor) throw connectorError('INVALID_ALLOCATIONS', 'El reparto no coincide con el total aprobado.', 400);
  return allocations.filter((a) => !['platform', 'platform-fee', 'fee', 'organizer'].includes(a.id) && !['platform', 'organizer'].includes(a.role) && !['platform', 'organizer'].includes(a.kind) && !a.retained);
}

function normalizedEmail(value) {
  if (typeof value !== 'string' || value.length > 127 || !/^[\x21-\x7e]+$/.test(value) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  const at = value.lastIndexOf('@');
  // Domains are case-insensitive; preserve the local part rather than assuming
  // that every provider treats differently cased mailbox names as equivalent.
  return value.slice(0, at) + '@' + value.slice(at + 1).toLowerCase();
}

function configuredPayoutRecipients(env, allocations) {
  let recipients;
  try { recipients = JSON.parse(env.PAYPAL_PAYOUT_RECIPIENTS || '{}'); }
  catch { throw connectorError('INVALID_PAYOUT_CONFIGURATION', 'PAYPAL_PAYOUT_RECIPIENTS debe ser JSON válido.', 503); }
  if (!recipients || typeof recipients !== 'object' || Array.isArray(recipients)) throw connectorError('INVALID_PAYOUT_CONFIGURATION', 'PAYPAL_PAYOUT_RECIPIENTS debe ser un objeto JSON.', 503);
  return new Map(allocations.map(allocation => {
    const configured = Object.hasOwn(recipients, allocation.id) ? recipients[allocation.id] : env[`PAYPAL_${allocation.id.replace(/-/g, '_').toUpperCase()}_EMAIL`];
    const receiver = normalizedEmail(configured);
    if (!receiver) throw connectorError('PAYOUT_RECIPIENT_MISSING', `Configura un receptor Sandbox válido para ${allocation.id}.`, 503);
    return [allocation.id, receiver];
  }));
}

function verifiedPayoutBatch(payouts, agreement, expectedBatchId, expectedRecipients) {
  const batchId = providerId(payouts?.batch_header?.payout_batch_id);
  if (batchId !== expectedBatchId) throw connectorError('PAYOUT_BATCH_MISMATCH', 'El lote devuelto por PayPal no coincide con el lote conocido.');
  const senderBatchId = payouts.batch_header.sender_batch_header?.sender_batch_id;
  if (senderBatchId !== undefined && senderBatchId !== stableRequestId('batch', agreement.id)) throw connectorError('PAYOUT_BATCH_MISMATCH', 'La referencia del remitente no corresponde al acuerdo.');
  const status = payouts.batch_header.batch_status;
  if (typeof status !== 'string' || !/^[A-Z_]{1,50}$/.test(status)) throw connectorError('INVALID_PROVIDER_RESPONSE', 'PayPal no devolvió un estado de lote válido.');
  const allocations = payoutAllocations(agreement);
  const expectedItems = new Map(allocations.map(allocation => [stableRequestId('item', `${agreement.id}:${allocation.id}`), allocation]));
  if (expectedItems.size !== 3) throw connectorError('INVALID_ALLOCATIONS', 'La reconciliación de esta demo requiere tres asignaciones de proveedor.', 400);
  const items = payouts.items === undefined ? [] : payouts.items;
  if (!Array.isArray(items) || items.length > 3 || (payouts.total_items !== undefined && (!Number.isInteger(payouts.total_items) || payouts.total_items > 3 || payouts.total_items < items.length))
      || (payouts.total_pages !== undefined && (!Number.isInteger(payouts.total_pages) || payouts.total_pages < 0 || payouts.total_pages > 1))
      || (payouts.links !== undefined && !Array.isArray(payouts.links)) || payouts.links?.some(link => link?.rel === 'next')) {
    throw connectorError('INVALID_PAYOUT_BATCH', 'El lote contiene más pagos de los esperados o requiere una página adicional.');
  }
  const seenSenderIds = new Set();
  const seenPayoutIds = new Set();
  const verifiedItems = items.map(item => {
    const senderItemId = item?.payout_item?.sender_item_id;
    const allocation = expectedItems.get(senderItemId);
    if (!allocation) throw connectorError('PAYOUT_ITEM_MISMATCH', 'Un pago del lote no corresponde a una asignación esperada.');
    const payoutItemId = providerId(item.payout_item_id);
    if (seenSenderIds.has(senderItemId) || seenPayoutIds.has(payoutItemId)) throw connectorError('DUPLICATE_PAYOUT_ITEM', 'El lote contiene referencias de pago duplicadas.');
    seenSenderIds.add(senderItemId);
    seenPayoutIds.add(payoutItemId);
    if (item.payout_batch_id !== undefined && item.payout_batch_id !== expectedBatchId) throw connectorError('PAYOUT_BATCH_MISMATCH', 'Un pago pertenece a otro lote de PayPal.');
    const amount = item.payout_item.amount;
    const amountMinor = verifiedAmount({ currency_code: amount?.currency, value: amount?.value }, allocation.amountMinor, 'PAYOUT_AMOUNT_MISMATCH');
    // A sender_item_id is an accounting reference, not proof of the destination.
    // Verify PayPal's echoed receiver against private server configuration, then
    // expose only the match result; never copy recipient addresses into receipts.
    const recipientType = item.payout_item.recipient_type ?? payouts.batch_header.sender_batch_header?.recipient_type;
    const receiver = normalizedEmail(item.payout_item.receiver);
    if (recipientType !== 'EMAIL' || !receiver || receiver !== expectedRecipients.get(allocation.id)) {
      throw connectorError('PAYOUT_RECIPIENT_MISMATCH', 'PayPal no confirmó el destinatario configurado para una asignación.');
    }
    if (typeof item.transaction_status !== 'string' || !/^[A-Z_]{1,50}$/.test(item.transaction_status)) throw connectorError('INVALID_PROVIDER_RESPONSE', 'PayPal no devolvió un estado individual válido.');
    return { payoutItemId, senderItemId, allocationId: allocation.id, status: item.transaction_status, amountMinor, currency: 'EUR', recipientMatched: true };
  });
  // In-progress batches may expose fewer items. The domain service requires all
  // three independently verified successes before it can mark the agreement SETTLED.
  return { batchId, status, items: verifiedItems };
}

export function createPaymentAdapter(env = process.env, options = {}) {
  const kind = env.PAYMENTS_MODE || env.PAYPAL_MODE || 'demo';
  if (!['demo', 'paypal-sandbox'].includes(kind)) throw connectorError('UNSUPPORTED_PAYMENT_MODE', 'Solo se permite demo o paypal-sandbox.', 500);
  const fetchImpl = options.fetch || globalThis.fetch;
  const now = options.now || Date.now;
  const cached = new Map();
  const objects = new Map();
  let token;
  let tokenPromise;
  async function accessToken() {
    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) throw connectorError('PAYPAL_NOT_CONFIGURED', 'Faltan credenciales de PayPal Sandbox en el servidor.', 503);
    if (token && token.expiresAt > now()) return token.value;
    if (!tokenPromise) {
      tokenPromise = (async () => {
        const data = await fetchJson(fetchImpl, `${PAYPAL_SANDBOX_BASE}/v1/oauth2/token`, {
          method: 'POST', headers: { authorization: `Basic ${Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
            'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials',
        }, 'PayPal Sandbox');
        if (!data.access_token || !Number.isFinite(data.expires_in)) throw connectorError('INVALID_PROVIDER_RESPONSE', 'PayPal Sandbox: OAuth no válido.');
        token = { value: data.access_token, expiresAt: now() + Math.max(0, data.expires_in - 60) * 1000 };
        return token.value;
      })().finally(() => { tokenPromise = undefined; });
    }
    return tokenPromise;
  }
  async function api(path, { method = 'GET', body, requestId } = {}) {
    const auth = await accessToken();
    try {
      return await fetchJson(fetchImpl, `${PAYPAL_SANDBOX_BASE}${path}`, { method,
        headers: { authorization: `Bearer ${auth}`, 'content-type': 'application/json',
          ...(method !== 'GET' && { Prefer: 'return=representation' }), ...(requestId && { 'PayPal-Request-Id': requestId }) },
        ...(body !== undefined && { body: JSON.stringify(body) }) }, 'PayPal Sandbox');
    } catch (error) {
      if (error.details?.httpStatus === 401) token = undefined;
      throw error;
    }
  }
  async function demoOnce(key, create) {
    if (!cached.has(key)) cached.set(key, create());
    return structuredClone(cached.get(key));
  }
  const demoId = (type, key) => `DEMO-${type}-${hash(key).slice(0, 18).toUpperCase()}`;
  function remember(id, data) { objects.set(id, data); return data; }

  const adapter = {
    kind, mode: kind,
    status() { return { mode: kind, configured: kind === 'demo' || Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET),
      sandboxOnly: true, webhookConfigured: Boolean(env.PAYPAL_WEBHOOK_ID), simulated: kind === 'demo' }; },
    async createOrder(args) {
      const { agreement } = args;
      const id = agreementId(agreement);
      const currency = agreement.currency || 'EUR';
      const value = moneyValue(agreement.totalMinor, currency);
      const key = requestKey('order', args, id);
      if (kind === 'demo') return demoOnce(key, () => remember(demoId('ORDER', key), {
        orderId: demoId('ORDER', key), status: 'CREATED', simulated: true, provider: kind, amountMinor: agreement.totalMinor, currency,
      }));
      const base = new URL(env.PUBLIC_BASE_URL || 'http://localhost:8787');
      if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) throw connectorError('INVALID_RETURN_URL', 'PUBLIC_BASE_URL no válido.', 500);
      const data = await api('/v2/checkout/orders', { method: 'POST', requestId: key,
        body: { intent: 'AUTHORIZE', purchase_units: [{ reference_id: id.slice(0, 256), custom_id: id.slice(0, 127),
          description: 'Experiencia astronómica con condiciones verificables', amount: { currency_code: currency, value } }],
        payment_source: { paypal: { experience_context: { brand_name: 'ASTERION', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW',
          return_url: new URL('/?paypal=approved', base).href, cancel_url: new URL('/?paypal=cancelled', base).href } } } } });
      if (!data.id) throw connectorError('INVALID_PROVIDER_RESPONSE', 'PayPal Sandbox no devolvió un identificador de pedido.');
      const approvalUrl = data.links?.find((l) => ['payer-action', 'approve'].includes(l.rel))?.href;
      return { orderId: data.id, status: data.status, ...(approvalUrl && { approvalUrl }), simulated: false, provider: kind };
    },
    async authorizeOrder(args) {
      const orderId = args.orderId;
      const encoded = requireId(orderId, 'Pedido');
      if (args.agreement) moneyValue(args.agreement.totalMinor, args.agreement.currency || 'EUR');
      const key = requestKey('authorize', args, orderId);
      if (kind === 'demo') return demoOnce(key, () => remember(demoId('AUTH', key), {
        orderId, authorizationId: demoId('AUTH', key), status: 'CREATED', simulated: true, provider: kind,
      }));
      const data = await api(`/v2/checkout/orders/${encoded}/authorize`, { method: 'POST', body: {}, requestId: key });
      const unit = verifiedUnit(data, orderId, args.agreement);
      const authorizations = unit.payments?.authorizations;
      if (!Array.isArray(authorizations) || authorizations.length !== 1) throw connectorError('PAYPAL_AUTHORIZATION_MISSING', 'PayPal Sandbox no confirmó una única autorización.');
      // Order.status can be COMPLETED while authorization.status is only CREATED/PENDING.
      // Preserve the authorization's actual status; the domain service decides readiness.
      return { orderId, ...verifiedAuthorization(authorizations[0], args.agreement), simulated: false, provider: kind };
    },
    async captureAuthorization(args) {
      const encoded = requireId(args.authorizationId, 'Autorización');
      const currency = args.currency || 'EUR';
      const value = moneyValue(args.amountMinor, currency);
      const key = requestKey('capture', args, args.authorizationId);
      if (kind === 'demo') return demoOnce(key, () => remember(demoId('CAPTURE', key), {
        captureId: demoId('CAPTURE', key), authorizationId: args.authorizationId, status: 'COMPLETED', amountMinor: args.amountMinor, currency, simulated: true, provider: kind,
      }));
      const data = await api(`/v2/payments/authorizations/${encoded}/capture`, { method: 'POST', requestId: key,
        body: { amount: { currency_code: currency, value }, final_capture: true } });
      return { ...verifiedCapture(data, { totalMinor: args.amountMinor }, { ...paymentRefs(args.agreement), authorizationId: args.authorizationId }), simulated: false, provider: kind };
    },
    async voidAuthorization(args) {
      const encoded = requireId(args.authorizationId, 'Autorización');
      const key = requestKey('void', args, args.authorizationId);
      if (kind === 'demo') return demoOnce(key, () => remember(args.authorizationId, {
        authorizationId: args.authorizationId, status: 'VOIDED', simulated: true, provider: kind,
      }));
      await api(`/v2/payments/authorizations/${encoded}/void`, { method: 'POST', requestId: key });
      return { authorizationId: args.authorizationId, status: 'VOIDED', simulated: false, provider: kind };
    },
    async createPayouts(args) {
      const { agreement } = args;
      const id = agreementId(agreement);
      const allocations = payoutAllocations(agreement);
      const key = requestKey('payouts', args, id);
      const batchId = stableRequestId('batch', id);
      const itemId = (allocation) => stableRequestId('item', `${id}:${allocation.id}`);
      if (kind === 'demo') return demoOnce(key, () => remember(demoId('PAYOUT', batchId), {
        batchId: demoId('PAYOUT', batchId), status: 'SUCCESS', simulated: true, provider: kind,
        items: allocations.map((a) => ({ allocationId: a.id, payoutItemId: demoId('ITEM', itemId(a)), senderItemId: itemId(a), status: 'SUCCESS', amountMinor: a.amountMinor })),
      }));
      const recipients = configuredPayoutRecipients(env, allocations);
      const items = allocations.map((allocation) => {
        const receiver = recipients.get(allocation.id);
        return { recipient_type: 'EMAIL', receiver, amount: { value: moneyValue(allocation.amountMinor, agreement.currency || 'EUR'), currency: agreement.currency || 'EUR' },
          sender_item_id: itemId(allocation), note: `Acuerdo ${id.slice(0, 120)}` };
      });
      const captureId = args.captureId || paymentRefs(agreement).captureId;
      if (!captureId) throw connectorError('CAPTURE_REQUIRED', 'El reparto necesita una captura confirmada.', 409);
      const capture = await api(`/v2/payments/captures/${requireId(captureId, 'Captura')}`);
      if (capture.status !== 'COMPLETED') throw connectorError('CAPTURE_NOT_COMPLETED', 'La captura sigue pendiente; no se pueden enviar pagos.', 409);
      verifiedCapture(capture, agreement, paymentRefs(agreement), captureId);
      const data = await api('/v1/payments/payouts', { method: 'POST', requestId: key,
        body: { sender_batch_header: { sender_batch_id: batchId, email_subject: 'Liquidación de experiencia ASTERION' }, items } });
      if (!data.batch_header?.payout_batch_id) throw connectorError('INVALID_PROVIDER_RESPONSE', 'PayPal Sandbox no devolvió un lote de pagos.');
      return { batchId: data.batch_header.payout_batch_id, status: data.batch_header.batch_status || 'PENDING', simulated: false, provider: kind,
        items: allocations.map((a) => ({ allocationId: a.id, senderItemId: itemId(a), status: 'PENDING', amountMinor: a.amountMinor })) };
    },
    async reconcile({ agreement }) {
      moneyValue(agreement?.totalMinor, agreement?.currency || 'EUR');
      const refs = paymentRefs(agreement);
      const result = { provider: kind, simulated: kind === 'demo' };
      if (kind === 'demo') {
        const capture = objects.get(refs.captureId);
        const authorization = objects.get(refs.authorizationId);
        const payouts = objects.get(refs.batchId);
        if (capture) result.payment = structuredClone(capture);
        else if (authorization) result.payment = structuredClone(authorization);
        if (payouts) result.payouts = structuredClone(payouts);
        return result;
      }
      const expectedRecipients = refs.batchId ? configuredPayoutRecipients(env, payoutAllocations(agreement)) : null;
      if (refs.captureId) {
        const capture = await api(`/v2/payments/captures/${requireId(refs.captureId, 'Captura')}`);
        result.payment = verifiedCapture(capture, agreement, refs, refs.captureId);
      } else if (refs.authorizationId) {
        const authorization = await api(`/v2/payments/authorizations/${requireId(refs.authorizationId, 'Autorización')}`);
        result.payment = verifiedAuthorization(authorization, agreement, refs.authorizationId);
      }
      const unknownCapture = !refs.captureId && (agreement.operations?.capture || ['CAPTURE_REQUESTED', 'CAPTURE_PENDING'].includes(agreement.payment?.status)
        || ['CAPTURED', 'PARTIALLY_CAPTURED'].includes(result.payment?.status));
      if (refs.orderId && (!refs.authorizationId || unknownCapture)) {
        const order = await api(`/v2/checkout/orders/${requireId(refs.orderId, 'Pedido')}`);
        const unit = verifiedUnit(order, refs.orderId, agreement);
        const authorizations = unit.payments?.authorizations ?? [];
        if (!Array.isArray(authorizations)) throw connectorError('INVALID_PROVIDER_RESPONSE', 'PayPal devolvió autorizaciones no válidas.');
        if (!refs.authorizationId && authorizations.length === 1) result.payment = verifiedAuthorization(authorizations[0], agreement);
        const authorizationId = refs.authorizationId || result.payment?.authorizationId;
        const captures = unit.payments?.captures ?? [];
        if (!Array.isArray(captures) || captures.length > 1) throw connectorError('AMBIGUOUS_CAPTURE', 'La orden contiene varias capturas y requiere revisión; no se repetirá el cobro.');
        if (captures.length === 1) {
          const candidate = captures[0];
          providerId(candidate?.id);
          verifiedAmount(candidate.amount, agreement.totalMinor, 'CAPTURE_AMOUNT_MISMATCH');
          const capture = await api(`/v2/payments/captures/${requireId(candidate.id, 'Captura')}`);
          const related = capture.supplementary_data?.related_ids ?? {};
          const oneKnownAuthorization = authorizations.length === 1 && authorizations[0]?.id === authorizationId;
          // The capture must belong to this order and to its known authorization.
          // Related IDs prove the link; a single authorization in the known order also binds it.
          if (!authorizationId || (!oneKnownAuthorization && related.authorization_id !== authorizationId)) throw connectorError('UNVERIFIED_CAPTURE', 'No se pudo vincular la captura a la autorización acordada.');
          result.payment = verifiedCapture(capture, agreement, { orderId: refs.orderId, authorizationId }, candidate.id);
        } else if (unknownCapture) {
          // CAPTURED on an authorization alone is not a completed capture receipt.
          result.payment = { ...result.payment, status: 'PENDING', recoveryPending: true };
        }
      }
      if (refs.batchId) {
        const payouts = await api(`/v1/payments/payouts/${requireId(refs.batchId, 'Lote')}?page_size=1000`);
        result.payouts = verifiedPayoutBatch(payouts, agreement, refs.batchId, expectedRecipients);
      }
      return result;
    },
    async verifyWebhook({ headers = {}, event, webhookEvent }) {
      // A DEMO webhook never proves that a provider sent a financial event.
      if (kind === 'demo' || !env.PAYPAL_WEBHOOK_ID) return false;
      const getHeader = (name) => typeof headers.get === 'function' ? headers.get(name) : headers[name] || headers[name.toUpperCase()];
      const fields = { auth_algo: getHeader('paypal-auth-algo'), cert_url: getHeader('paypal-cert-url'), transmission_id: getHeader('paypal-transmission-id'),
        transmission_sig: getHeader('paypal-transmission-sig'), transmission_time: getHeader('paypal-transmission-time') };
      if (Object.values(fields).some((v) => typeof v !== 'string' || !v)) return false;
      const webhook = event || webhookEvent;
      if (!webhook || typeof webhook !== 'object') return false;
      const data = await api('/v1/notifications/verify-webhook-signature', { method: 'POST', body: { ...fields, webhook_id: env.PAYPAL_WEBHOOK_ID, webhook_event: webhook } });
      return data.verification_status === 'SUCCESS';
    },
  };
  // Both names keep the domain service independent of PayPal's endpoint vocabulary.
  adapter.authorize = (args) => adapter.authorizeOrder(args);
  adapter.capture = (args) => adapter.captureAuthorization({ ...args, authorizationId: args.authorizationId || paymentRefs(args.agreement).authorizationId,
    amountMinor: args.amountMinor ?? args.agreement?.totalMinor, currency: args.currency || args.agreement?.currency });
  adapter.void = (args) => adapter.voidAuthorization({ ...args, authorizationId: args.authorizationId || paymentRefs(args.agreement).authorizationId });
  adapter.payouts = (args) => adapter.createPayouts(args);
  return adapter;
}
