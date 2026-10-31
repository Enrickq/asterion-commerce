# Verificación de la entrega pública

## Cierre de candidatura

ASTERION quedó [presentada en Devpost](https://devpost.com/software/asterion-061uwp) el **29 de octubre de 2026**. El [justificante](evidence/devpost-submission.json) conserva la confirmación de la interfaz y la comprobación pública del 31 de octubre. Este cierre documental no reejecuta las pruebas históricas de PayPal o Gemini ni cambia la aplicación desplegada.

## Revisión del paquete del 27 de octubre de 2026

Sobre el código del baseline `9a2ecff` volvieron a pasar **143/143 pruebas**, build, preflight y smoke. El smoke cubrió captura clara, anulación con nubes o datos obsoletos, Autopilot claro y nublado y recibos íntegros. La consulta de solo lectura al despliegue devolvió HTTP 200 en la interfaz y en `/api/status`, con `mode=demo` y `publicDemo=true`. No se ejecutaron nuevas transacciones ni solicitudes privadas a Gemini o PayPal. La revisión de credenciales buscó patrones precisos y coincidencias con valores locales sin publicarlos.

El paquete actual añade el deck inglés del 27 de octubre y alinea su secuencia con el vídeo de 165 segundos. Las diez diapositivas y seis tablas nativas se conservan; solo cambia visualmente la diapositiva 6. Las notas 6, 8 y 10 corrigen tiempos y enlaces. La comparación de píxeles no encontró cambios en las otras nueve diapositivas. Esta verificación utiliza renders y estructura del archivo, sin afirmar una inspección en PowerPoint.

El README, el manuscrito y la candidatura separan el recorrido público de 1.480 EUR de la prueba histórica privada de 1.650 EUR. En esta revisión del 27 de octubre aún estaban pendientes la comparación de voz, la selección del vídeo y el envío. El propietario eligió después la edición neuronal y la candidatura quedó enviada el 29 de octubre, según el justificante enlazado arriba.

Verificación pública actualizada el **26 de octubre de 2026**, hora de Canarias. Las pruebas privadas de PayPal y Gemini abarcan el 22 y el 23 de octubre; sus registros conservan las marcas de tiempo UTC y la revisión histórica.

- Demo: https://asterion-mj13.onrender.com/
- Repositorio: https://github.com/Enrickq/asterion-commerce
- Commit de aplicación desplegado: `a23e4cd5d049dd4e4de1a55768bd46e5b3e0a48c`.
- CI: [ejecución completa en verde](https://github.com/Enrickq/asterion-commerce/actions/runs/40310939358).
- Render: servicio `asterion`, región Frankfurt, plan **Free**, auto-deploy desactivado.
- Despliegue `dep-dbfj3svb9u1s73d51570`, estado confirmado **live**, finalizado el 26 de octubre a las 10:57:54 UTC.

## Comprobaciones realizadas

GitHub Actions instaló dependencias, ejecutó preflight, **143 pruebas**, compiló el frontend y completó el smoke del sistema, que ahora incluye el verificador offline de recibos. La verificación local obtuvo el mismo resultado. Las pruebas automatizadas de conectores utilizan mocks; las llamadas externas se documentan por separado.

En la URL pública, `/api/status` devolvió HTTP 200, `mode=demo`, `publicDemo=true`, almacenamiento SQLite y Render desplegado. El frontend de producción cargó y se probó en navegador.

Dos acuerdos nuevos ejecutaron la secuencia negociar, consentir el hash, crear orden y autorizar. Tras armar Autopilot, el cliente solo consultó el estado. El servidor completó las operaciones:

| Evidencia simulada | Trabajo | Acuerdo final | Captura |
| --- | --- | --- | --- |
| Cielo válido | COMPLETED | SETTLED | Simulada, seguida de tres payouts separados |
| Nubes | COMPLETED | VOIDED | Ninguna |

Los dos recibos confirmaron `agreementHashValid=true` y `eventChainValid=true`. Además, el navegador público completó el recorrido de cielo válido y mostró los tres destinatarios con estado `SUCCESS` en AG Grid.

## Alcance de esta evidencia

El servidor, la orquestación autónoma y AG Grid funcionan en Render. Los precios, el inventario, el clima usado para liquidación y los pagos de esta demo pública son simulados. Una consulta separada de previsión MET Norway usa datos externos modelados, sin modificar el acuerdo ni habilitar cobros. En un entorno local privado, Gemini completó una negociación de tres proveedores y el mismo acuerdo terminó liquidado mediante PayPal Sandbox. Anthropic, AEMET y Kernel continúan sin ejecución externa.

El plan gratuito usa SQLite temporal. Un reinicio, reemplazo o suspensión por inactividad puede eliminar acuerdos y claves de sesión. La persistencia local probada no convierte ese alojamiento gratuito en almacenamiento durable. No se han contratado recursos de pago.

Al registrar esta versión se preparó un montaje local de revisión de 2:50 con capturas de pasos reales, voz sintética y subtítulos. Posteriormente el propietario eligió y publicó la [edición de 2:45](https://www.youtube.com/watch?v=l_cS_-SIsdQ); su acceso y metadatos se recogen en el [registro de publicación](evidence/youtube-publication.json). El registro del participante y el envío final en Devpost están completados. Este documento acredita la versión pública del prototipo y el cierre de entrega, sin anticipar la revisión de elegibilidad ni el resultado del concurso.

## Descarga de recibos desde el navegador

La grabación de pasos detectó un error del cliente: al recibir un objeto con una sección `agreement`, devolvía solo esa sección. El servidor ya generaba el recibo completo. La corrección conserva todo el JSON, y una regresión HTTP valida tanto liquidación como anulación mediante el mismo cliente de la interfaz.

Después del despliegue se ejecutaron dos acuerdos nuevos en el navegador público. Se descargaron ambos recibos mediante **Export receipt** y se comprobaron offline. El claro terminó `SETTLED`, con 14 eventos; el nublado `VOIDED`, con 12. El registro mostró ambos estados actualizados. Al reabrir el acuerdo claro después del nublado, la etiqueta volvió al escenario claro realmente evaluado. [Resumen sanitizado de la verificación](evidence/browser-receipt-verification.json).

## Revisión de recuperación PayPal Sandbox

Esta sección y las siguientes pruebas de PayPal/Gemini describen la revisión histórica del 23 de octubre, con 71 pruebas en ese momento. La revisión meteorológica desplegada posteriormente pasó 114; no se han reetiquetado los cobros históricos como ejecuciones de código nuevo.

Una revisión posterior añadió recuperación de respuestas perdidas mediante GET de autorización, orden y captura, validación de importes y referencias del proveedor, y exposición del control privado de Autopilot únicamente tras el opt-in del servidor. El recorrido de autorización conserva por separado el estado de la orden y el de la autorización.

**71 pruebas pasan** en la revisión actual. Incluyen payloads Sandbox simulados con respuesta de captura perdida, autorización pendiente, importes incorrectos, referencias ajenas y capturas múltiples. La prueba de integración verifica que la recuperación registra `CAPTURE_RECOVERED` con un solo POST de captura. Una anulación incierta bloquea nuevas ejecuciones y reevaluaciones hasta reconciliarse, incluso tras reiniciar SQLite. La revisión también valida referencias, importes y moneda por Payout. Estas pruebas utilizan mocks; las llamadas externas se acreditan por separado.

La configuración privada `.env.sandbox` está excluida de Git y usa datos y puerto separados. Las credenciales se obtuvieron de la app «ASTERION Sandbox» con autorización del titular y solo se guardan en ese archivo privado. Autopilot Sandbox se habilitó después de las pruebas manuales y de configurar tres destinatarios ficticios distintos; la plantilla lo conserva desactivado por defecto.

## Pruebas externas de PayPal Sandbox

Se verificó OAuth contra `https://api-m.sandbox.paypal.com`, sin registrar el token. Un comprador ficticio aprobó dos órdenes mediante el checkout oficial Sandbox. La aplicación solicitó sus autorizaciones al servidor PayPal.

| Recorrido privado | Resultado de la API PayPal | Importe | Primera verificación UTC |
| --- | --- | --- | --- |
| Cielo válido de prueba → captura | Captura `COMPLETED` | 1.480 EUR | 22/10/2026 09:48:45 |
| Nubes de prueba → anulación | Autorización `VOIDED`, sin capture ID | 1.480 EUR autorizados; sin captura | 22/10/2026 16:06:10 |

La comprobación posterior usó consultas autenticadas GET del adaptador para contrastar el estado, importe y referencias del proveedor. Ambos recibos conservaron el hash del acuerdo y la cadena de eventos válidos. El [resumen saneado](evidence/paypal-sandbox.json) conserva referencias de transacciones Sandbox emitidas por PayPal, con cuentas ficticias, sin credenciales, tokens, direcciones de correo ni identificadores de sesión. `captureVerifiedAt` registra la primera comprobación de captura; `verifiedAt` y `payoutItemsVerifiedAt` registran comprobaciones posteriores del acuerdo y sus desembolsos, por eso sus horas difieren.

Después de la captura manual se creó el lote `BAC4GMDTDQGR2`. Las consultas GET confirmaron `SUCCESS` para cada proveedor: guía 400 EUR, telescopio 500 EUR y transporte 400 EUR. El acuerdo pasó a `SETTLED`. El organizador mantuvo el resto bruto de 180 EUR antes de comisiones e impuestos; los Payouts utilizan su saldo disponible, no un split atómico de la captura.

Un tercer acuerdo, con aprobación nueva del comprador ficticio, probó Autopilot Sandbox. Tras armarlo, el navegador solo observó el estado: el servidor evaluó el fixture claro, capturó 1.480 EUR y confirmó los tres Payouts. Autopilot terminó `COMPLETED` con resultado `SETTLED` el 22/10/2026 a las 16:15:58 UTC, tras 10 ciclos que consultaron la confirmación asíncrona del proveedor. El [resumen de evidencia](evidence/paypal-sandbox.json) conserva las referencias del nuevo cobro y del lote.

Un cuarto mandato aprobado probó Autopilot con nubes. El servidor anuló la autorización sin captura ni Payouts y terminó `COMPLETED`, resultado `VOIDED`, el 22/10/2026 a las 16:27:13 UTC. PayPal confirmó posteriormente `VOIDED` mediante GET.

Estas pruebas utilizan dinero ficticio. La negociación y el clima de los cuatro acuerdos permanecen en modo determinista y fixtures. No prueban meteorología real, una negociación completa con modelo ni entrega de webhooks. La demo pública conserva sus pagos simulados.

## Verificación de Gemini y liquidación del mismo acuerdo

Se creó una clave privada con autorización del titular y se verificó en AI Studio el nivel gratuito y las cuotas de los modelos. Los primeros 13 intentos produjeron dos respuestas HTTP 200 aisladas, nueve errores 503, un 404 y un timeout. Esos intentos no crearon ningún acuerdo ni pago. La integración solicita ahora las ofertas secuencialmente, permite una sola repetición ante 503 y da a Gemini un límite de respuesta de 45 segundos. No repite errores de cuota o autenticación ni sustituye ofertas fallidas por precios locales. Las llamadas financieras conservan su límite de 15 segundos.

Una nueva ejecución del **23 de octubre de 2026, hora de Canarias**, completó tres llamadas reales de `gemini-3.1-flash-lite`, todas HTTP 200 y con una única llamada `quote` válida por proveedor. Las ofertas fueron guía 425 EUR, telescopio 620 EUR y transporte 425 EUR. Con 180 EUR de coordinación, el acuerdo sumó 1.650 EUR dentro de un mandato de 1.700 EUR. La inferencia de esta ejecución tardó aproximadamente 55 segundos. El [registro saneado de Gemini](evidence/gemini-verification.json) conserva modelo, tokens, hashes de respuestas y vínculo al acuerdo.

Ese mismo acuerdo se aprobó mediante checkout Sandbox y se autorizó por 1.650 EUR. Tras armar Autopilot, el servidor evaluó el fixture claro, capturó el importe y completó tres Payouts. Consultas GET confirmaron captura `COMPLETED`, pagos individuales `SUCCESS`, importes EUR exactos y destinatarios configurados coincidentes. El acuerdo y el trabajo terminaron `SETTLED` y `COMPLETED`, con hash y cadena válidos. Ver [evidencia integrada](evidence/ai-sandbox-run.json).

La revisión añade validación de lote, asignación, moneda e importe por Payout y rechaza duplicados o referencias ajenas. Los lotes parciales conservan estado pendiente. **71 pruebas locales pasan** con esta revisión; las consultas externas también verificaron los lotes históricos con el nuevo adaptador. La configuración privada vuelve a negociación determinista para nuevas misiones, sin alterar la procedencia Gemini del acuerdo ya guardado. No se activó facturación de Google.

El catálogo, el inventario y el clima siguen siendo de prueba. Las explicaciones del modelo no pueden modificar el catálogo de servicios, las asignaciones validadas ni la política financiera. Esta ejecución no demuestra una reserva real, meteorología externa, entrega de webhooks o uso de dinero real.

## Previsión externa y procedencia de observaciones

El 25 de octubre se verificó `GET /api/weather/preview` en la URL pública: HTTP 200, previsión MET Norway real, `observedAt:null` y `settlementReady:false`. El listado de acuerdos de la sesión permaneció idéntico antes y después. El [registro saneado](evidence/weather-preview.json) separa hora de validez, actualización del modelo y consulta. La [captura de interfaz](assets/asterion-weather-preview.png) muestra datos, atribución y límite de uso.

En la misma versión desplegada, dos nuevos mandatos públicos completaron Autopilot: cielo de fixture → `SETTLED`, nubes de fixture → `VOIDED`, con hashes de recibos válidos. Los pagos permanecen simulados. Ninguna de estas consultas repite Gemini o mueve fondos Sandbox.

La política 1.1 añade coordenadas, radio y tolerancia de altitud a los términos aprobados. Las observaciones reales deben aportar fechas con zona, mediciones completas y procedencia; duplicados renombrados, datos ajenos al sitio y previsiones no habilitan la captura. La independencia se declara por el adaptador y todavía necesita validación de campo. Ver [contrato meteorológico](WEATHER.md).

## Evidencias visibles, recibos completos y reembolsos

La vista pública [Verified runs](https://asterion-mj13.onrender.com/#verified-runs) muestra los registros históricos Gemini/Sandbox, sus fechas, fuentes JSON, importes y referencias. Conserva la etiqueta de fondos de prueba, inventario y clima simulado; no ejecuta un pago nuevo. La [captura publicada](assets/asterion-verified-runs.png) acredita la nueva interfaz.

En esta versión se repitieron los dos recorridos públicos de Autopilot: cielo de fixture → `SETTLED`, nubes → `VOIDED`. Ambos recibos conservaron su integridad y pasaron además el verificador offline. La negociación, los pagos y el clima de estos recorridos son simulados.

Las pruebas reproducen recibos con más de 100 eventos sin recorte, reembolsos completos/parciales que bloquean nuevas operaciones y Payouts cuyo destinatario no coincide con la configuración privada. Estas pruebas nuevas son sintéticas; no amplían las verificaciones externas históricas de PayPal.

Se revisaron las vistas a 390, 768 y 1440 px sin desbordamiento horizontal del documento. La navegación conserva nombres accesibles al ocultar etiquetas. El diálogo nativo se comprobó en móvil: foco inicial, cierre con Escape, contenido de fondo inerte y restauración del foco. Se verificó un recorrido completo de autorización y Autopilot en el navegador local. La vista de evidencias pública no registró errores de consola durante la revisión.
