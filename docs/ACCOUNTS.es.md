# Cuentas y configuración · ASTERION

La demo local no necesita ninguna cuenta. Ya se puede probar con los modos `demo`, `deterministic` y `fixtures` de `.env.example`. Crear cuentas de proveedores no equivale a tener sus integraciones verificadas.

GitHub y Render ya están configurados para esta entrega: [repositorio público](https://github.com/Enrickq/asterion-commerce) y [demo publicada](https://asterion-mj13.onrender.com/). La demo gratuita utiliza pagos, agentes y meteorología simulados. PayPal Sandbox y un modelo real siguen pendientes de credenciales y pruebas externas.

## Lo mínimo que debe completar el titular

Para abrir servicios externos se necesita una identidad y un correo del titular, y en algunos casos verificación por email, sesión de navegador, condiciones del proveedor o facturación. Estos datos no están configurados por este repositorio. El titular debe completar la autenticación y las verificaciones que se le presenten; después se puede continuar con la configuración técnica.

No enviar contraseñas, códigos de verificación ni claves API por el chat. Guardar los secretos en `.env` local o en las variables privadas del servicio de hosting.

| Servicio | Acceso oficial | Necesario para | Datos de configuración |
| --- | --- | --- | --- |
| PayPal Developer | [Dashboard](https://developer.paypal.com/dashboard/) y [guía inicial](https://developer.paypal.com/api/get-started/) | Probar la ruta PayPal Sandbox | Client ID y Secret de app Sandbox; cuenta comprador personal y merchant business de prueba |
| Anthropic / Claude API | [Consola](https://platform.claude.com/) y [guía de claves](https://platform.claude.com/docs/en/get-api-key) | Negociación con modelo real | API key, modelo disponible y acceso/facturación API |
| Google Gemini | [AI Studio](https://aistudio.google.com/) | Alternativa de negociación con modelo real | API key de servidor, modelo disponible y nivel de facturación/cuota verificado |
| AEMET OpenData | [Portal](https://opendata.aemet.es/centrodedescargas/inicio) y [API](https://opendata.aemet.es/dist/) | Observaciones meteorológicas externas | API key vigente e ID real de estación |
| Render | [Dashboard](https://dashboard.render.com/) y [Blueprints](https://render.com/docs/infrastructure-as-code) | Publicar la aplicación | Repositorio conectado, revisión de costes y configuración privada |
| APIMatic | [Marketplace de contexto](https://context.apimatic.io/) | Contexto PayPal en un asistente compatible | No confundir instalación de desarrollo con integración de producción |
| Kernel | [Documentación oficial](https://www.kernel.sh/docs/) | Sesión opcional de navegador en el portal del proveedor | API key y destino HTTPS fijo; no reserva ni analiza el clima |
| Astropods | [Documentación oficial](https://docs.astropods.com/welcome) | Futuro despliegue de agentes independientes | No hay despliegue activo en esta versión |

## PayPal Sandbox

1. Entrar o crear la cuenta del titular en PayPal Developer y completar sus verificaciones.
2. Obtener una app **Sandbox**, junto con el merchant business y el comprador personal de prueba. La [guía de cuentas Sandbox](https://developer.paypal.com/sandbox-testing/accounts) explica cómo administrarlos.
3. Copiar `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET` a `.env`. Mantenerlos fuera del navegador y del repositorio.
4. Configurar `PAYMENTS_MODE=paypal-sandbox`. Mantener el resto de modos locales si se quiere probar solo pagos.
5. Mantener `PUBLIC_DEMO=false` en el entorno privado de pruebas y ajustar `PUBLIC_BASE_URL` al origen accesible para el retorno del comprador. Con Vite es `http://localhost:5173`. Reiniciar el servidor y ejecutar `node scripts/preflight.mjs`.
6. Aprobar el pedido con el comprador Sandbox y comprobar autorización, captura y anulación en escenarios independientes.
7. Para webhooks, usar HTTPS accesible y registrar el endpoint implementado en la app correcta; guardar su `PAYPAL_WEBHOOK_ID`. Verificar la recepción y la autenticación del evento.
8. Configurar destinatarios Sandbox para Payouts solo cuando la cuenta tenga acceso; comprobar los resultados individuales. Un payout separado no es un split atómico del cobro.

Ninguna de estas operaciones utiliza dinero real. El código solo admite modo demo o PayPal Sandbox.

## Modelo real y meteorología real

Para Anthropic: configurar `AGENT_MODE=anthropic`, `ANTHROPIC_API_KEY` y un `ANTHROPIC_MODEL` disponible en esa cuenta. Una suscripción de chat no demuestra acceso API. Los proveedores pueden cobrar llamadas; revisar la facturación propia antes de ejecutar.

Para Gemini: configurar `AGENT_MODE=gemini`, `GEMINI_API_KEY` y el identificador exacto de un `GEMINI_MODEL` disponible en el proyecto. Verificar la cuota y el nivel de facturación antes de llamar a la API. Para la primera prueba del paquete de dos personas, usar 1.700 € de presupuesto para cubrir todas las ofertas válidas. La demo pública conserva el modo determinista.

Para AEMET: configurar `WEATHER_MODE=aemet`, `AEMET_API_KEY` y `AEMET_STATION_ID`. Las observaciones convencionales no garantizan por sí solas cielo despejado; si faltan variables exigidas por el mandato, el sistema debe bloquear la captura. No sustituir campos ausentes por valores favorables.

## Publicar en Render

`render.yaml` prepara un servicio **Free** con `PUBLIC_DEMO=true`, pagos simulados y SQLite temporal. No utiliza disco de pago. Puede tardar en arrancar tras inactividad y pierde acuerdos y claves de sesión cuando se reinicia, redespliega o suspende por inactividad. Ver [limitaciones oficiales del plan gratuito](https://render.com/docs/free).

Los acuerdos y recibos se aíslan por sesión invitada mediante cookie firmada HttpOnly. Abrir otro navegador no permite verlos; borrar la cookie puede hacerlos inaccesibles. No es una cuenta de usuario verificada. El modo público bloquea pagos Sandbox y sesiones Kernel.

`render.persistent.yaml` es una alternativa opcional de pago con servicio `0.5c-512mb` y disco de 1 GB. **Necesita aprobación explícita de presupuesto antes de desplegarla.** Revisar [precios de Render](https://render.com/pricing). El archivo no despliega automáticamente ni abre una cuenta.

Conectar el repositorio y aplicar únicamente el Blueprint elegido. Para pagos Sandbox utilizar un entorno privado con `PUBLIC_DEMO=false`, los secretos en configuración privada y una URL de retorno correcta. No convertir la demo pública gratuita en un procesador de pruebas con credenciales compartidas.

No usar la publicación del demo para afirmar que se ha utilizado Render Workflows o Astropods. El adaptador Kernel requiere su propia ejecución externa verificada. Ver [matriz de integraciones](INTEGRATIONS.md).
