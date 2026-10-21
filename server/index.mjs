import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, extname, resolve, sep } from 'node:path';
import { createStore } from './store.mjs';
import { createCore, DomainError } from './core.mjs';
import { createPaymentAdapter } from './connectors/paypal.mjs';
import { negotiate } from './connectors/agents.mjs';
import { createWeatherAdapter } from './connectors/weather.mjs';
import * as integrations from './connectors/integrations.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_BODY = 64 * 1024;
const SESSION_MAX_AGE = 14 * 24 * 60 * 60;
const SESSION_COOKIE = 'asterion_session';
const isEnabled = value => value === 'true' || value === '1';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };

function json(response, status, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store', ...extraHeaders });
  response.end(body);
}

async function bodyJSON(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] ?? '')) throw new DomainError(415, 'JSON_REQUIRED', 'Envía un cuerpo application/json.');
  const size = Number(request.headers['content-length']);
  if (Number.isFinite(size) && size > MAX_BODY) throw new DomainError(413, 'BODY_TOO_LARGE', 'La petición supera el límite de 64 KiB.');
  const chunks = [];
  let length = 0;
  await new Promise((resolveBody, rejectBody) => {
    let failed = false;
    request.on('data', chunk => {
      length += chunk.length;
      if (failed) return;
      if (length > MAX_BODY) {
        failed = true;
        chunks.length = 0;
        rejectBody(new DomainError(413, 'BODY_TOO_LARGE', 'La petición supera el límite de 64 KiB.'));
        return;
      }
      chunks.push(chunk);
    });
    request.once('end', resolveBody);
    request.once('aborted', () => rejectBody(new DomainError(400, 'REQUEST_ABORTED', 'La petición se interrumpió.')));
    request.once('error', rejectBody);
  });
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object required');
    return value;
  } catch { throw new DomainError(400, 'INVALID_JSON', 'El cuerpo debe ser un objeto JSON válido.'); }
}

function enforceOrigin(request, env) {
  const origin = request.headers.origin;
  if (request.headers['sec-fetch-site'] === 'cross-site') throw new DomainError(403, 'ORIGIN_FORBIDDEN', 'Origen de la petición no permitido.');
  if (!origin) return; // CLI clients and signed PayPal callbacks do not use browser origins.
  const host = request.headers.host;
  const allowed = new Set([`http://${host}`, `https://${host}`]);
  if (env.PUBLIC_BASE_URL || env.PUBLIC_URL) {
    try { allowed.add(new URL(env.PUBLIC_BASE_URL || env.PUBLIC_URL).origin); } catch { /* invalid config is never trusted */ }
  }
  if (env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:5173');
    allowed.add('http://127.0.0.1:5173');
  }
  if (!allowed.has(origin)) throw new DomainError(403, 'ORIGIN_FORBIDDEN', 'Origen de la petición no permitido.');
}

async function serveStatic(request, response, pathname, root) {
  const dist = resolve(root, 'dist');
  const publicDir = resolve(root, 'public');
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { throw new DomainError(400, 'INVALID_PATH', 'Ruta inválida.'); }
  if (decoded.includes('\0') || decoded.includes('\\')) throw new DomainError(400, 'INVALID_PATH', 'Ruta inválida.');
  const base = decoded === '/supplier-portal.html' ? publicDir : dist;
  let file = resolve(base, `.${decoded === '/' ? '/index.html' : decoded}`);
  if (file !== base && !file.startsWith(base + sep)) throw new DomainError(403, 'PATH_FORBIDDEN', 'Ruta no permitida.');
  try {
    if (!(await stat(file)).isFile()) throw new Error('not file');
  } catch {
    if (extname(decoded) || decoded === '/supplier-portal.html') return false;
    file = resolve(dist, 'index.html');
    try { if (!(await stat(file)).isFile()) return false; } catch { return false; }
  }
  const data = await readFile(file);
  response.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600' });
  response.end(request.method === 'HEAD' ? undefined : data);
  return true;
}

function sessionSecret(env, dataDir) {
  if (env.SESSION_SECRET) {
    if (env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
    return env.SESSION_SECRET;
  }
  // Persist the signing key with SQLite so a restart does not orphan browser sessions.
  const file = resolve(dataDir, '.session-key');
  mkdirSync(dataDir, { recursive: true });
  try { writeFileSync(file, randomBytes(48).toString('base64url'), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const secret = readFileSync(file, 'utf8').trim();
  if (secret.length < 32) throw new Error('La clave persistente de sesión no es válida.');
  return secret;
}

function sessionManager(secret, env) {
  const sign = value => createHmac('sha256', secret).update(value).digest('base64url');
  return (request, response) => {
    const cookie = (request.headers.cookie ?? '').split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
    let nonce;
    if (cookie && cookie.length < 300) {
      const parts = cookie.split('.');
      if (parts.length === 4 && parts[0] === 'v1' && /^[A-Za-z0-9_-]{43}$/.test(parts[1]) && /^\d{10}$/.test(parts[2]) && /^[A-Za-z0-9_-]{43}$/.test(parts[3])) {
        const payload = parts.slice(0, 3).join('.');
        const expected = Buffer.from(sign(payload));
        const signature = Buffer.from(parts[3]);
        const age = Math.floor(Date.now() / 1000) - Number(parts[2]);
        if (expected.length === signature.length && timingSafeEqual(expected, signature) && age >= -60 && age <= SESSION_MAX_AGE) nonce = parts[1];
      }
    }
    if (!nonce) {
      nonce = randomBytes(32).toString('base64url');
      const payload = `v1.${nonce}.${Math.floor(Date.now() / 1000)}`;
      const forwardedProtocol = request.headers['x-forwarded-proto']?.split(',')[0].trim();
      const secure = Boolean(request.socket.encrypted) || forwardedProtocol === 'https' || env.PUBLIC_BASE_URL?.startsWith('https://');
      response.setHeader('Set-Cookie', `${SESSION_COOKIE}=${payload}.${sign(payload)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}${secure ? '; Secure' : ''}`);
    }
    // Receipts contain a one-way owner reference, never the signed session credential.
    return { ownerId: createHash('sha256').update(nonce).digest('hex') };
  };
}

function createRateLimiter() {
  const buckets = new Map();
  return (key, limit, windowMilliseconds) => {
    const time = Date.now();
    if (buckets.size > 10000) {
      for (const [bucketKey, value] of buckets) if (value.expiresAt <= time) buckets.delete(bucketKey);
      if (buckets.size > 10000) throw new DomainError(503, 'SERVER_BUSY', 'Hay demasiadas sesiones activas. Inténtalo más tarde.');
    }
    let bucket = buckets.get(key);
    if (!bucket || bucket.expiresAt <= time) { bucket = { count: 0, expiresAt: time + windowMilliseconds }; buckets.set(key, bucket); }
    bucket.count++;
    if (bucket.count > limit) {
      const error = new DomainError(429, 'RATE_LIMITED', 'Has alcanzado el límite temporal de peticiones. Inténtalo más tarde.');
      error.retryAfter = Math.ceil((bucket.expiresAt - time) / 1000);
      throw error;
    }
  };
}

/** Exported for HTTP integration testing without opening the default port. */
export function createHttpServer({ core, env = process.env, root = ROOT, integrationStatus, kernelSession, signingSecret } = {}) {
  if (!core) throw new TypeError('core es obligatorio.');
  const publicDemo = isEnabled(env.PUBLIC_DEMO);
  if (publicDemo && core.provider !== 'demo') throw new Error('PUBLIC_DEMO solo admite pagos simulados.');
  const getSession = sessionManager(signingSecret ?? env.SESSION_SECRET ?? randomBytes(48).toString('base64url'), env);
  const rateLimit = createRateLimiter();
  const getIntegrations = () => integrationStatus ? integrationStatus() : typeof integrations.getIntegrationStatus === 'function' ? integrations.getIntegrationStatus(env) : [];
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (env.NODE_ENV === 'production') {
      response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://www.sandbox.paypal.com; frame-src https://www.sandbox.paypal.com");
      response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    }
    try {
      const url = new URL(request.url, 'http://localhost');
      const pathname = url.pathname;
      if (pathname.length > 500) throw new DomainError(414, 'URI_TOO_LONG', 'Ruta demasiado larga.');
      if (pathname.startsWith('/api/')) {
        if (!['GET', 'POST', 'HEAD'].includes(request.method)) return json(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido.' } }, { Allow: 'GET, POST' });
        if (request.method === 'POST' && pathname !== '/api/paypal/webhook') enforceOrigin(request, env);
        const ip = request.socket.remoteAddress ?? 'unknown';
        rateLimit(`ip:${ip}`, 600, 60 * 1000);
        if (request.method === 'POST' && pathname === '/api/paypal/webhook') return json(response, 200, await core.webhook({ headers: request.headers, event: await bodyJSON(request) }));
        const session = getSession(request, response);
        if (request.method === 'POST') rateLimit(`mutations:${session.ownerId}`, publicDemo ? 180 : 600, 15 * 60 * 1000);
        if (request.method === 'GET' && pathname === '/api/status') return json(response, 200, { ...core.status(), agreements: core.list(session.ownerId).length, publicDemo, integrations: await getIntegrations() });
        if (request.method === 'GET' && pathname === '/api/integrations') return json(response, 200, { integrations: await getIntegrations() });
        if (request.method === 'GET' && pathname === '/api/agreements') return json(response, 200, { agreements: core.list(session.ownerId) });
        if (request.method === 'POST' && pathname === '/api/negotiate') {
          rateLimit(`negotiate:${session.ownerId}`, publicDemo ? 12 : 60, 15 * 60 * 1000);
          rateLimit(`negotiate-ip:${ip}`, publicDemo ? 100 : 300, 15 * 60 * 1000);
          return json(response, 201, await core.negotiate(await bodyJSON(request), { ownerId: session.ownerId }));
        }
        if (request.method === 'POST' && pathname === '/api/integrations/kernel/session') {
          await bodyJSON(request); // The caller can never supply the browser destination.
          if (publicDemo) throw new DomainError(403, 'OPERATOR_ONLY', 'Las sesiones externas de Kernel requieren acceso del operador.');
          rateLimit(`kernel:${session.ownerId}`, 3, 60 * 60 * 1000);
          const launch = kernelSession ?? integrations.createKernelSession ?? integrations.launchKernelSession;
          if (typeof launch !== 'function') throw new DomainError(503, 'KERNEL_UNAVAILABLE', 'Kernel no está configurado.');
          return json(response, 200, await launch(env));
        }
        const match = pathname.match(/^\/api\/agreements\/([a-zA-Z0-9_-]{1,80})(?:\/(consent|order|authorize|evaluate|execute|payouts|reconcile|receipt|autopilot))?$/);
        if (match) {
          const [, id, action] = match;
          const ownedAgreement = core.get(id);
          if (ownedAgreement.ownerId !== session.ownerId) throw new DomainError(404, 'NOT_FOUND', 'Acuerdo no encontrado.');
          if (request.method === 'GET' && !action) return json(response, 200, core.get(id));
          if (request.method === 'GET' && action === 'receipt') return json(response, 200, core.receipt(id), { 'Content-Disposition': `attachment; filename="asterion-${id}.json"` });
          if (request.method === 'POST' && action && action !== 'receipt') {
            const input = await bodyJSON(request);
            const method = action === 'order' ? 'createOrder' : action === 'autopilot' ? 'armAutopilot' : action;
            return json(response, 200, await core[method](id, input));
          }
        }
        return json(response, 404, { error: { code: 'NOT_FOUND', message: 'Ruta API no encontrada.' } });
      }
      if (!['GET', 'HEAD'].includes(request.method)) return json(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido.' } });
      if (await serveStatic(request, response, pathname, root)) return;
      json(response, 404, { error: { code: 'NOT_FOUND', message: 'Página no encontrada. Inicia Vite en desarrollo o genera dist con npm run build.' } });
    } catch (error) {
      const status = error instanceof DomainError || Number.isInteger(error?.statusCode) ? error.statusCode : 500;
      const safeStatus = status >= 400 && status <= 599 ? status : 500;
      const code = safeStatus === 500 ? 'INTERNAL_ERROR' : error.code ?? 'REQUEST_FAILED';
      const message = safeStatus === 500 ? 'Error interno. No se ha confirmado ninguna operación adicional.' : error.message;
      if (!response.headersSent) json(response, safeStatus, { error: { code, message } }, error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {});
      else response.end();
      if (safeStatus === 500) console.error(`[ASTERION] Request failed: ${error?.name ?? 'Error'}`);
    }
  });
}

export function startServer(env = process.env) {
  const dataDir = env.DATA_DIR ? resolve(env.DATA_DIR) : resolve(ROOT, 'data');
  const paymentAdapter = createPaymentAdapter(env);
  if (isEnabled(env.PUBLIC_DEMO) && paymentAdapter.mode !== 'demo') throw new Error('PUBLIC_DEMO solo admite pagos simulados.');
  const weather = createWeatherAdapter(env);
  const port = Number(env.PORT ?? 8787);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT inválido.');
  const signingSecret = sessionSecret(env, dataDir);
  const store = createStore({ dataDir });
  const core = createCore({ store, paymentAdapter, negotiate: input => negotiate(input, env), evidenceProvider: input => weather.createEvidence(input), allowSandboxAutopilot: isEnabled(env.ALLOW_SANDBOX_AUTOPILOT) && !isEnabled(env.PUBLIC_DEMO) });
  const server = createHttpServer({ core, env, signingSecret });
  const autopilotTimer = setInterval(() => { core.runDueAutopilots().catch(() => console.error('[ASTERION] Autonomous scheduler requires review.')); }, 250);
  autopilotTimer.unref();
  server.once('close', () => clearInterval(autopilotTimer));
  const host = env.HOST ?? '127.0.0.1';
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.listen(port, host, () => console.log(`[ASTERION] http://${host}:${server.address().port} · ${core.provider} · SQLite`));
  const close = () => {
    clearInterval(autopilotTimer);
    server.close(async () => { await core.waitForAutopilotIdle(); store.close(); });
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
  return { server, core, store, close };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startServer();
