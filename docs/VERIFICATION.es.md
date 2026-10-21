# Verificación de la entrega pública

Comprobación realizada el **22 de octubre de 2026**, hora de Canarias. Los registros de GitHub y Render usan UTC y muestran el 21 de octubre por la diferencia de una hora.

- Demo: https://asterion-mj13.onrender.com/
- Repositorio: https://github.com/Enrickq/asterion-commerce
- Commit de aplicación desplegado: `c7d2884d8afa2a50a338e48562150ebc10c4709d`.
- CI: [ejecución completa en verde](https://github.com/Enrickq/asterion-commerce/actions/runs/39691960571).
- Render: servicio `asterion`, región Frankfurt, plan **Free**, auto-deploy desactivado.
- Despliegue `dep-dbcke7fb9u1s73bvtv80`, estado confirmado **live**.

## Comprobaciones realizadas

GitHub Actions instaló dependencias, ejecutó preflight, **54 pruebas**, compiló el frontend y completó el smoke del sistema. La verificación local obtuvo el mismo resultado. Las pruebas de conectores externos utilizan mocks y no acreditan una transacción PayPal ni una inferencia real.

En la URL pública, `/api/status` devolvió HTTP 200, `mode=demo`, `publicDemo=true`, almacenamiento SQLite y Render desplegado. El frontend de producción cargó y se probó en navegador.

Dos acuerdos nuevos ejecutaron la secuencia negociar, consentir el hash, crear orden y autorizar. Tras armar Autopilot, el cliente solo consultó el estado. El servidor completó las operaciones:

| Evidencia simulada | Trabajo | Acuerdo final | Captura |
| --- | --- | --- | --- |
| Cielo válido | COMPLETED | SETTLED | Simulada, seguida de tres payouts separados |
| Nubes | COMPLETED | VOIDED | Ninguna |

Los dos recibos confirmaron `agreementHashValid=true` y `eventChainValid=true`. Además, el navegador público completó el recorrido de cielo válido y mostró los tres destinatarios con estado `SUCCESS` en AG Grid.

## Alcance de esta evidencia

El servidor, la orquestación autónoma y AG Grid funcionan en Render. Los precios, el inventario, el clima y los pagos de esta demo son simulados y así se muestran en la interfaz. No se ha realizado todavía una llamada real a PayPal Sandbox, Gemini, Anthropic, AEMET o Kernel.

El plan gratuito usa SQLite temporal. Un reinicio, reemplazo o suspensión por inactividad puede eliminar acuerdos y claves de sesión. La persistencia local probada no convierte ese alojamiento gratuito en almacenamiento durable. No se han contratado recursos de pago.

La entrega del hackathon y el vídeo siguen pendientes. Este documento acredita la versión pública del prototipo, no su elegibilidad final ni un resultado en el concurso.
