# ASTERION · Cierre de candidatura

Estado actualizado el 24 de octubre de 2026. Esto es un plan de entrega; la candidatura no está enviada.

## Lo obligatorio pendiente

1. Grabar el recorrido funcional, editarlo a menos de tres minutos y publicar el vídeo en YouTube. [Guion en inglés listo para grabación](DEMO.en.md).
2. Revisar todo el material presentado en inglés o aportar traducción. Descripción, instrucciones, [guion](DEMO.en.md) y [manuscrito de diez diapositivas](PITCH.en.md) disponibles en inglés. El deck visual sigue en español; su herramienta devolvió un error de acceso y no se modificó.
3. Confirmar elegibilidad e identidad del participante, registro en Devpost y campos de candidatura. La revisión técnica de las bases no confirma la elegibilidad personal.
4. Revisar y enviar la candidatura; comprobar que vídeo, repositorio, licencia e instrucciones permiten al jurado evaluar el proyecto.

Según las [bases oficiales](https://paypalaihackathon.devpost.com/rules), consultadas el 23 de octubre, el cierre es el **12 de noviembre de 2026 a las 12:00 PST: 20:00 en Canarias**. Objetivo interno: dejar la entrega lista el 9 de noviembre. Debe mantenerse acceso para el jurado hasta que termine la evaluación.

## Mejoras que aportan evidencia

La prioridad técnica es sustituir el escenario meteorológico por datos adecuados al lugar, altitud y horario del acuerdo. La observación convencional de AEMET que admite el adaptador actual no proporciona toda la evidencia de nubes exigida. Una predicción de ciudad o un dato ausente no habilitan el cobro. Mientras falten esos datos, se conserva la etiqueta de simulación y el cierre seguro del adaptador real.

Se ha añadido una [consulta separada de previsión MET Norway](WEATHER.md), que muestra datos externos modelados y bloquea su uso como evidencia suficiente de captura. No sustituye las observaciones locales pendientes.

Después: verificar entrega de webhooks y mejorar la prueba visible de uso de sponsors. AG Grid y Render están en uso; APIMatic se utilizó como contexto de desarrollo. Kernel requiere una ejecución externa comprobada. No se debe anunciar Astropods, Elastic o Channel3 como integraciones activas.

Las bases no conceden un bono automático por sumar tres sponsors. Permiten como máximo un premio principal y uno de sponsor, o una mención y uno de sponsor. Conviene demostrar profundidad antes que añadir servicios sin una función útil.

## Ya verificable

- Demo pública y repositorio MIT accesibles.
- 71 pruebas automáticas, build, preflight y smoke aprobados en CI para el commit de aplicación desplegado `18370ca`.
- Tres llamadas reales de Gemini produjeron un acuerdo de 1.650 EUR dentro de un mandato de 1.700 EUR.
- Ese mismo acuerdo completó captura y tres Payouts en PayPal Sandbox mediante Autopilot; [evidencia](evidence/ai-sandbox-run.json).
- Otra ejecución verificó anulación autónoma con condición nublada, sin captura; [evidencia](evidence/paypal-sandbox.json).

El catálogo, disponibilidad y clima siguen simulados. No hay reserva con un operador real ni garantía de premio. La demo pública conserva pagos simulados; las pruebas Sandbox privadas usan fondos ficticios.

La nueva revisión meteorológica pasó **114 pruebas locales**, compilación y preflight. El smoke verificó captura y anulación en los escenarios simulados. La consulta externa de previsión está registrada por separado; no reejecuta ni amplía las pruebas históricas de PayPal o Gemini.
