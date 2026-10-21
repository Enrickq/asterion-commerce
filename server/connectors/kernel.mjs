import { connectorError, fetchJson } from './shared.mjs';

// Documented API: https://www.kernel.sh/docs/api-reference/browsers/create-a-browser-session
export function createKernelAdapter(env = process.env, options = {}) {
  return {
    kind: 'kernel',
    status() { return { configured: Boolean(env.KERNEL_API_KEY && env.KERNEL_SUPPLIER_URL), connected: false, mode: 'optional-adapter' }; },
    async createSession() {
      if (!env.KERNEL_API_KEY || !env.KERNEL_SUPPLIER_URL) throw connectorError('KERNEL_NOT_CONFIGURED', 'Configura KERNEL_API_KEY y KERNEL_SUPPLIER_URL en el servidor.', 503);
      let target;
      try { target = new URL(env.KERNEL_SUPPLIER_URL); } catch { throw connectorError('INVALID_SUPPLIER_URL', 'La URL del proveedor no es válida.', 503); }
      if (target.protocol !== 'https:' || target.username || target.password || target.port || target.search || target.hash ||
        /(^localhost$|\.(local|internal)$|^\d+(\.\d+){3}$|:)/i.test(target.hostname)) throw connectorError('INVALID_SUPPLIER_URL', 'Se requiere una URL HTTPS pública sin credenciales ni parámetros.', 503);
      const data = await fetchJson(options.fetch || globalThis.fetch, 'https://api.onkernel.com/browsers', {
        method: 'POST', headers: { authorization: `Bearer ${env.KERNEL_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ headless: false, start_url: target.href, timeout_seconds: 300, network: { allowed_hosts: [target.hostname] } }),
      }, 'Kernel');
      if (!data.session_id) throw connectorError('INVALID_PROVIDER_RESPONSE', 'Kernel no devolvió un identificador de sesión.');
      return { sessionId: data.session_id, liveViewUrl: data.browser_live_view_url || null, provider: 'kernel', simulated: false,
        targetHost: target.hostname, expiresAfterIdleSeconds: 300,
        note: 'Sesión de navegador real. No se ha ejecutado una reserva ni un pago.' };
    },
  };
}
