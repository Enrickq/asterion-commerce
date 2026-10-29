# ASTERION · Cierre de candidatura

Estado actualizado el 29 de octubre de 2026. El [vídeo neuronal elegido, de 2:45](https://www.youtube.com/watch?v=l_cS_-SIsdQ), ya tiene acceso público y reproducción comprobados. El [registro de publicación](evidence/youtube-publication.json) recoge la consulta anónima y la inspección del navegador. La candidatura no está enviada; faltan el registro del participante, los campos finales y la confirmación de Devpost. El propietario ha cerrado las mejoras opcionales de miniatura y pista adicional de subtítulos sin solicitar cambios al canal.

## Lo obligatorio pendiente

1. Revisar el paquete final en inglés. Descripción, instrucciones, guion y [PowerPoint editable de diez diapositivas](presentation/ASTERION-Pitch.en-2026-10-27.pptx) disponibles. El [manuscrito](PITCH.en.md) aporta notas ampliadas. La edición inglesa conserva el deck español anterior.
2. Confirmar elegibilidad e identidad del participante, registro en Devpost y campos de candidatura. La revisión técnica de las bases no confirma la elegibilidad personal.
3. Introducir el vídeo, repositorio y demo en los campos de Devpost, revisar la candidatura completa y enviarla. Guardar la confirmación de envío. Un borrador guardado o un vídeo publicado no constituyen por sí solos una candidatura enviada.

Según las [bases oficiales](https://paypalaihackathon.devpost.com/rules), consultadas el 27 de octubre, el cierre es el **12 de noviembre de 2026 a las 12:00 PST: 20:00 en Canarias**. Objetivo interno: dejar la entrega lista el 9 de noviembre. Debe mantenerse acceso para el jurado hasta que termine la evaluación.

## Vídeo cerrado para la entrega

La consulta anónima confirmó estado reproducible, duración de 165 segundos y visibilidad pública. En el navegador se comprobaron título, descripción, capítulos y la etiqueta visible de IA. Esta revisión no atribuye una valoración subjetiva de escucha.

YouTube expone por ahora una pista automática de inglés, con un error de reconocimiento en «La Palma». Los [64 subtítulos exactos](video/ASTERION-Launch-Captions.en.srt) siguen disponibles en el repositorio y renderizados dentro del montaje. El propietario decidió el 29 de octubre no añadir otra pista ni cambiar la miniatura. Estas mejoras opcionales están cerradas y no bloquean la entrega. El [texto de publicación](video/YOUTUBE-LAUNCH.en.md) y la [revisión de voz](video/VOICE-PUBLICATION.en.md) conservan el contexto de simulación y evidencia histórica Sandbox.

## Mejoras que aportan evidencia

La prioridad técnica es sustituir el escenario meteorológico por datos adecuados al lugar, altitud y horario del acuerdo. La observación convencional de AEMET que admite el adaptador actual no proporciona toda la evidencia de nubes exigida. Una predicción de ciudad o un dato ausente no habilitan el cobro. Mientras falten esos datos, se conserva la etiqueta de simulación y el cierre seguro del adaptador real.

Se ha añadido una [consulta separada de previsión MET Norway](WEATHER.md), que muestra datos externos modelados y bloquea su uso como evidencia suficiente de captura. No sustituye las observaciones locales pendientes.

Después: verificar entrega de webhooks y mejorar la prueba visible de uso de sponsors. AG Grid y Render están en uso; APIMatic se utilizó como contexto de desarrollo. Kernel requiere una ejecución externa comprobada. No se debe anunciar Astropods, Elastic o Channel3 como integraciones activas.

Las bases no conceden un bono automático por sumar tres sponsors. Permiten como máximo un premio principal y uno de sponsor, o una mención y uno de sponsor. Conviene demostrar profundidad antes que añadir servicios sin una función útil.

## Ya verificable

- Demo pública y repositorio MIT accesibles.
- 143 pruebas automáticas, build, preflight y smoke aprobados en CI para el commit de aplicación desplegado `a23e4cd`, incluida la verificación de recibos a través del cliente utilizado por la interfaz.
- Tres llamadas reales de Gemini produjeron un acuerdo de 1.650 EUR dentro de un mandato de 1.700 EUR.
- Ese mismo acuerdo completó captura y tres Payouts en PayPal Sandbox mediante Autopilot; [evidencia](evidence/ai-sandbox-run.json).
- Otra ejecución verificó anulación autónoma con condición nublada, sin captura; [evidencia](evidence/paypal-sandbox.json).

El catálogo, disponibilidad y clima siguen simulados. No hay reserva con un operador real ni garantía de premio. La demo pública conserva pagos simulados; las pruebas Sandbox privadas usan fondos ficticios.

La revisión meteorológica pasó **114 pruebas locales y CI**, compilación y preflight. El smoke y la verificación pública comprobaron captura y anulación en los escenarios simulados. La consulta externa de previsión también está verificada en Render y [registrada por separado](evidence/weather-preview.json); no reejecuta ni amplía las pruebas históricas de PayPal o Gemini.

La revisión de experiencia e integridad del 25 de octubre pasó **142 pruebas** y añadió la vista pública **Verified runs**, recibos verificables offline, estados de reembolso seguros y mejoras de lectura y teclado. El 26 de octubre una descarga real de la interfaz detectó que su cliente extraía solo los términos del recibo. La corrección conserva todas las secciones, pasa **143 pruebas** y está desplegada. El recibo descargado desde la interfaz corregida pasó el verificador offline. La presentación inglesa está actualizada. El montaje neuronal tiene acceso público comprobado; quedan el registro del participante y el envío de la candidatura.
