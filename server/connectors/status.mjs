export function getIntegrationStatus(env = process.env) {
  const paymentMode = env.PAYMENTS_MODE || env.PAYPAL_MODE || 'demo';
  const agentMode = env.AGENT_MODE || 'deterministic';
  const weatherMode = env.WEATHER_MODE || 'fixtures';
  return [
    { id: 'paypal', name: 'PayPal', status: paymentMode === 'demo' ? 'demo' : env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET ? 'configured' : 'requires-credentials',
      mode: paymentMode, detail: paymentMode === 'demo' ? 'Simulación local explícita; no mueve dinero.' : 'Adaptador PayPal Sandbox. No admite Live.' },
    { id: 'agents', name: 'Agentes negociadores', status: agentMode === 'anthropic' ? env.ANTHROPIC_API_KEY && env.ANTHROPIC_MODEL ? 'configured' : 'requires-credentials' : 'demo',
      mode: agentMode, detail: agentMode === 'anthropic' ? 'Ofertas mediante Anthropic con límites deterministas.' : 'Agentes locales con precios de reserva independientes. No se usa un LLM.' },
    { id: 'weather', name: 'Oráculo meteorológico', status: weatherMode === 'fixtures' ? 'demo' : env.AEMET_API_KEY && env.AEMET_STATION_ID ? 'configured' : 'requires-credentials',
      mode: weatherMode, detail: weatherMode === 'fixtures' ? 'Escenarios meteorológicos reproducibles y etiquetados.' : 'AEMET: observación de estación; insuficiente por sí sola para capturar.' },
    { id: 'kernel', name: 'Kernel', status: env.KERNEL_API_KEY && env.KERNEL_SUPPLIER_URL ? 'configured' : 'configurable', mode: 'optional-adapter',
      detail: 'Adaptador para crear una sesión de navegador en el portal configurado. Sin reserva automática.' },
    { id: 'ag-grid', name: 'AG Grid', status: 'integrated', mode: 'frontend', detail: 'Panel de datos operativo de la aplicación.' },
    { id: 'render', name: 'Render', status: env.RENDER_SERVICE_ID ? 'deployed' : 'deployment-ready', mode: 'hosting', detail: 'Blueprint de despliegue; el estado del flujo persiste en la base de datos.' },
    { id: 'apimatic', name: 'APIMatic', status: env.APIMATIC_CONTEXT_INSTALLED === 'true' ? 'development-tool' : 'documented', mode: 'development-only',
      detail: 'Context Plugin para construir la integración PayPal; no ejecuta pagos ni agentes en producción.' },
    { id: 'astropods', name: 'Astropods', status: 'planned', mode: 'not-connected', detail: 'Extensión futura para desplegar agentes proveedores. No utilizada por esta demo.' },
    { id: 'elastic', name: 'Elastic', status: 'planned', mode: 'not-connected', detail: 'Extensión futura de búsqueda híbrida. No utilizada por esta demo.' },
  ];
}

export const integrationStatus = getIntegrationStatus;
