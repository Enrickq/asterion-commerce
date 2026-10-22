# Verificación de la entrega pública

Comprobación realizada el **22 de octubre de 2026**, hora de Canarias. Los registros técnicos conservan sus marcas de tiempo UTC.

- Demo: https://asterion-mj13.onrender.com/
- Repositorio: https://github.com/Enrickq/asterion-commerce
- Commit de aplicación desplegado: `20606056ba21d0d4644516842021106508cd61a1`.
- CI: [ejecución completa en verde](https://github.com/Enrickq/asterion-commerce/actions/runs/39757019170).
- Render: servicio `asterion`, región Frankfurt, plan **Free**, auto-deploy desactivado.
- Despliegue `dep-dbctjmbncjis73djpej0`, estado confirmado **live**.

## Comprobaciones realizadas

GitHub Actions instaló dependencias, ejecutó preflight, **64 pruebas**, compiló el frontend y completó el smoke del sistema. La verificación local obtuvo el mismo resultado. Las pruebas automatizadas de conectores utilizan mocks; las llamadas PayPal reales se documentan por separado a continuación.

En la URL pública, `/api/status` devolvió HTTP 200, `mode=demo`, `publicDemo=true`, almacenamiento SQLite y Render desplegado. El frontend de producción cargó y se probó en navegador.

Dos acuerdos nuevos ejecutaron la secuencia negociar, consentir el hash, crear orden y autorizar. Tras armar Autopilot, el cliente solo consultó el estado. El servidor completó las operaciones:

| Evidencia simulada | Trabajo | Acuerdo final | Captura |
| --- | --- | --- | --- |
| Cielo válido | COMPLETED | SETTLED | Simulada, seguida de tres payouts separados |
| Nubes | COMPLETED | VOIDED | Ninguna |

Los dos recibos confirmaron `agreementHashValid=true` y `eventChainValid=true`. Además, el navegador público completó el recorrido de cielo válido y mostró los tres destinatarios con estado `SUCCESS` en AG Grid.

## Alcance de esta evidencia

El servidor, la orquestación autónoma y AG Grid funcionan en Render. Los precios, el inventario, el clima y los pagos de esta demo pública son simulados y así se muestran en la interfaz. Las llamadas reales a PayPal Sandbox y Gemini se ejecutaron en un entorno local privado. Gemini devolvió ofertas aisladas, pero todavía no completó una negociación de tres proveedores. Anthropic, AEMET y Kernel continúan sin ejecución externa.

El plan gratuito usa SQLite temporal. Un reinicio, reemplazo o suspensión por inactividad puede eliminar acuerdos y claves de sesión. La persistencia local probada no convierte ese alojamiento gratuito en almacenamiento durable. No se han contratado recursos de pago.

La entrega del hackathon y el vídeo siguen pendientes. Este documento acredita la versión pública del prototipo, no su elegibilidad final ni un resultado en el concurso.

## Revisión de recuperación PayPal Sandbox

Una revisión posterior añadió recuperación de respuestas perdidas mediante GET de autorización, orden y captura, validación de importes y referencias del proveedor, y exposición del control privado de Autopilot únicamente tras el opt-in del servidor. El recorrido de autorización conserva por separado el estado de la orden y el de la autorización.

**64 pruebas pasan** en esta revisión. Incluyen payloads Sandbox simulados con respuesta de captura perdida, autorización pendiente, importes incorrectos, referencias ajenas y capturas múltiples. La prueba de integración verifica que la recuperación registra `CAPTURE_RECOVERED` con un solo POST de captura. Una anulación incierta bloquea nuevas ejecuciones y reevaluaciones hasta reconciliarse, incluso tras reiniciar SQLite. Estas pruebas utilizan mocks y no acreditan llamadas externas de PayPal.

La configuración privada `.env.sandbox` está excluida de Git y usa datos y puerto separados. Las credenciales se obtuvieron de la app «ASTERION Sandbox» con autorización del titular y solo se guardan en ese archivo privado. Autopilot Sandbox se habilitó después de las pruebas manuales y de configurar tres destinatarios ficticios distintos; la plantilla lo conserva desactivado por defecto.

## Pruebas externas de PayPal Sandbox

Se verificó OAuth contra `https://api-m.sandbox.paypal.com`, sin registrar el token. Un comprador ficticio aprobó dos órdenes mediante el checkout oficial Sandbox. La aplicación solicitó sus autorizaciones al servidor PayPal.

| Recorrido privado | Resultado de la API PayPal | Importe | Verificación UTC |
| --- | --- | --- | --- |
| Cielo válido de prueba → captura | Captura `COMPLETED` | 1.480 EUR | 22/10/2026 09:48:45 |
| Nubes de prueba → anulación | Autorización `VOIDED`, sin capture ID | 1.480 EUR autorizados; sin captura | 22/10/2026 16:06:10 |

La comprobación posterior usó consultas autenticadas GET del adaptador para contrastar el estado, importe y referencias del proveedor. Ambos recibos conservaron el hash del acuerdo y la cadena de eventos válidos. El [resumen saneado](evidence/paypal-sandbox.json) conserva identificadores ficticios y marcas de tiempo, sin credenciales, tokens, direcciones de correo ni identificadores de sesión.

Después de la captura manual se creó el lote `BAC4GMDTDQGR2`. Las consultas GET confirmaron `SUCCESS` para cada proveedor: guía 400 EUR, telescopio 500 EUR y transporte 400 EUR. El acuerdo pasó a `SETTLED`. El organizador mantuvo el resto bruto de 180 EUR antes de comisiones e impuestos; los Payouts utilizan su saldo disponible, no un split atómico de la captura.

Un tercer acuerdo, con aprobación nueva del comprador ficticio, probó Autopilot Sandbox. Tras armarlo, el navegador solo observó el estado: el servidor evaluó el fixture claro, capturó 1.480 EUR y confirmó los tres Payouts. Autopilot terminó `COMPLETED` con resultado `SETTLED` el 22/10/2026 a las 16:15:58 UTC, tras 10 ciclos que consultaron la confirmación asíncrona del proveedor. El [resumen de evidencia](evidence/paypal-sandbox.json) conserva las referencias del nuevo cobro y del lote.

Un cuarto mandato aprobado probó Autopilot con nubes. El servidor anuló la autorización sin captura ni Payouts y terminó `COMPLETED`, resultado `VOIDED`, el 22/10/2026 a las 16:27:13 UTC. PayPal confirmó posteriormente `VOIDED` mediante GET.

Estas pruebas utilizan dinero ficticio. La negociación y el clima de los cuatro acuerdos permanecen en modo determinista y fixtures. No prueban meteorología real, una negociación completa con modelo ni entrega de webhooks. La demo pública conserva sus pagos simulados.

## Verificación parcial de Gemini

Se creó una clave privada con autorización del titular y se verificó en AI Studio el nivel gratuito y las cuotas de los modelos. La consulta REST de modelos funcionó. De 13 solicitudes de inferencia en comprobaciones acotadas, dos devolvieron HTTP 200 con una llamada `quote` válida para el guía. Nueve devolvieron 503, una 404 y otra agotó el tiempo de respuesta. Ninguna negociación reunió las tres ofertas; no se creó un acuerdo ni un pago a partir de esos intentos. El [resumen saneado](evidence/gemini-verification.json) incluye versión del modelo, consumo de tokens y hashes de las respuestas correctas.

La integración ahora solicita las ofertas secuencialmente y reintenta una sola vez los errores Gemini 503. No reintenta errores de cuota o autenticación ni sustituye ofertas fallidas por precios locales. El límite de respuesta Gemini es 45 segundos; las operaciones financieras conservan 15 segundos. **66 pruebas locales**, compilación, preflight y smoke pasan con este cambio. La configuración privada vuelve a negociación determinista hasta completar la prueba externa. No se activó facturación de Google.
