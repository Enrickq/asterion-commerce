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
      const key = requestKey('authorize', args, orderId);
      if (kind === 'demo') return demoOnce(key, () => remember(demoId('AUTH', key), {
        orderId, authorizationId: demoId('AUTH', key), status: 'CREATED', simulated: true, provider: kind,
      }));
      const data = await api(`/v2/checkout/orders/${encoded}/authorize`, { method: 'POST', body: {}, requestId: key });
      const authorization = data.purchase_units?.[0]?.payments?.authorizations?.[0];
      if (!authorization?.id) throw connectorError('PAYPAL_AUTHORIZATION_MISSING', 'PayPal Sandbox no confirmó una autorización.');
      return { orderId, authorizationId: authorization.id, status: authorization.status, simulated: false, provider: kind,
        ...(authorization.expiration_time && { expirationTime: authorization.expiration_time }) };
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
      if (!data.id || !data.status) throw connectorError('INVALID_PROVIDER_RESPONSE', 'PayPal Sandbox no confirmó el estado de captura.');
      return { captureId: data.id, status: data.status, authorizationId: args.authorizationId, simulated: false, provider: kind };
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
      let recipients = {};
      try { recipients = JSON.parse(env.PAYPAL_PAYOUT_RECIPIENTS || '{}'); } catch { throw connectorError('INVALID_PAYOUT_CONFIGURATION', 'PAYPAL_PAYOUT_RECIPIENTS debe ser JSON válido.', 503); }
      const items = allocations.map((allocation) => {
        const receiver = recipients[allocation.id] || env[`PAYPAL_${allocation.id.replace(/-/g, '_').toUpperCase()}_EMAIL`];
        if (typeof receiver !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiver)) {
          throw connectorError('PAYOUT_RECIPIENT_MISSING', `Configura un receptor Sandbox para ${allocation.id}.`, 503);
        }
        return { recipient_type: 'EMAIL', receiver, amount: { value: moneyValue(allocation.amountMinor, agreement.currency || 'EUR'), currency: agreement.currency || 'EUR' },
          sender_item_id: itemId(allocation), note: `Acuerdo ${id.slice(0, 120)}` };
      });
      const captureId = args.captureId || paymentRefs(agreement).captureId;
      if (!captureId) throw connectorError('CAPTURE_REQUIRED', 'El reparto necesita una captura confirmada.', 409);
      const capture = await api(`/v2/payments/captures/${requireId(captureId, 'Captura')}`);
      if (capture.status !== 'COMPLETED') throw connectorError('CAPTURE_NOT_COMPLETED', 'La captura sigue pendiente; no se pueden enviar pagos.', 409);
      if (capture.amount?.currency_code !== (agreement.currency || 'EUR') || capture.amount?.value !== moneyValue(agreement.totalMinor, agreement.currency || 'EUR')) {
        throw connectorError('CAPTURE_AMOUNT_MISMATCH', 'La captura no coincide con el importe del acuerdo.', 409);
      }
      const data = await api('/v1/payments/payouts', { method: 'POST', requestId: key,
        body: { sender_batch_header: { sender_batch_id: batchId, email_subject: 'Liquidación de experiencia ASTERION' }, items } });
      if (!data.batch_header?.payout_batch_id) throw connectorError('INVALID_PROVIDER_RESPONSE', 'PayPal Sandbox no devolvió un lote de pagos.');
      return { batchId: data.batch_header.payout_batch_id, status: data.batch_header.batch_status || 'PENDING', simulated: false, provider: kind,
        items: allocations.map((a) => ({ allocationId: a.id, senderItemId: itemId(a), status: 'PENDING', amountMinor: a.amountMinor })) };
    },
    async reconcile({ agreement }) {
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
      if (refs.captureId) {
        const capture = await api(`/v2/payments/captures/${requireId(refs.captureId, 'Captura')}`);
        result.payment = { captureId: capture.id, status: capture.status };
      } else if (refs.authorizationId) {
        const authorization = await api(`/v2/payments/authorizations/${requireId(refs.authorizationId, 'Autorización')}`);
        result.payment = { authorizationId: authorization.id, status: authorization.status };
      }
      if (refs.batchId) {
        const payouts = await api(`/v1/payments/payouts/${requireId(refs.batchId, 'Lote')}?page_size=1000`);
        result.payouts = { batchId: payouts.batch_header?.payout_batch_id || refs.batchId, status: payouts.batch_header?.batch_status,
          items: (payouts.items || []).map((item) => ({ payoutItemId: item.payout_item_id, senderItemId: item.payout_item?.sender_item_id,
            allocationId: agreement.allocations.find((a) => stableRequestId('item', `${agreement.id}:${a.id}`) === item.payout_item?.sender_item_id)?.id,
            status: item.transaction_status })) };
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
