# ASTERION · Guion de demo de 2:50

## Preparación

Ejecutar `pnpm dev`, abrir `http://localhost:5173` y comprobar los indicadores de modo. El recorrido reproducible usa agentes deterministas, meteorología de fixture y pagos simulados. Decirlo en voz alta. Para grabar una variante con PayPal Sandbox, validar antes las credenciales y completar la aprobación real del comprador en PayPal; el tiempo de login puede requerir editar el vídeo.

No depender de que esa noche haya buen tiempo. Las ramas meteorológicas de demo son escenarios identificados. El sistema comprueba una política explícita; no garantiza el cielo futuro.

## Narración y acciones

| Tiempo | Acción visible | Texto sugerido |
| --- | --- | --- |
| 0:00–0:18 | Mostrar la intención y el límite de gasto | «Hoy compramos productos. Mañana delegaremos resultados. Quiero una noche privada bajo las estrellas de La Palma, con guía, telescopio y traslado, pero solo pagar si se cumplen las condiciones que he aprobado». |
| 0:18–0:43 | Negociar y abrir ofertas en AG Grid | «ASTERION coordina al agente del comprador con los agentes de tres proveedores. Veinte minutos de flexibilidad permiten pasar de 1.680 a 1.480 euros, dentro del mandato de 1.500. Son ofertas del escenario demo, no presupuestos de operadores reales». |
| 0:43–1:04 | Revisar el mandato y consentir | «Este es el límite de autonomía: importe, proveedores y política meteorológica. El usuario aprueba este mandato. La IA no puede ampliar su propio presupuesto». |
| 1:04–1:24 | Crear y autorizar el pago; enseñar indicador de modo | «En este recorrido los pagos están simulados. El adaptador Sandbox implementa la secuencia separada de aprobación, autorización y captura de PayPal. Autorizar todavía no es capturar». |
| 1:24–1:49 | Seleccionar cielo válido y pulsar «Arm autonomous execution» | «Este clic delega la ejecución dentro del mandato aprobado. El servidor guarda el trabajo antes de responder. Tres segundos después comprueba valores, antigüedad y fuentes. A partir de aquí el navegador solo consulta el estado». |
| 1:49–2:10 | Esperar el resultado autónomo y abrir recibo y asignaciones | «Sin otro clic, el servidor evalúa, captura la autorización y solicita los pagos posteriores a los proveedores. Cada operación conserva su propio estado e identificador. La evidencia habilita el cobro dentro de la política aprobada». |
| 2:10–2:36 | Nuevo acuerdo, autorizar, seleccionar nubes y armar Autopilot | «Ahora falla la condición. El servidor anula la autorización automáticamente, sin captura ni pagos a proveedores. El recibo conserva la razón. Un agente financiero también demuestra cuándo debe detenerse». |
| 2:36–2:50 | Mostrar recibo y cerrar con la visión | «Canarias es la primera historia. La infraestructura sirve para cualquier compra compleja: intención, compromiso, evidencia y pago. ASTERION: Intent. Evidence. Payment». |

## Variante verificada con PayPal Sandbox

El 22 de octubre de 2026 se verificaron cuatro acuerdos privados: captura y tres Payouts manuales, anulación manual, liquidación clara mediante Autopilot y anulación nublada mediante Autopilot. La negociación y el clima de esos acuerdos son simulados. Ver [evidencia](evidence/paypal-sandbox.json). El vídeo todavía está pendiente de grabación.

Cambiar la frase de 1:04 por: «Esto es PayPal Sandbox: fondos de prueba y una aprobación real en el entorno de pruebas». Mostrar el dominio de Sandbox durante la aprobación y el ID de autorización retornado por PayPal. Después de capturar o anular, contrastar el resultado en la cuenta Sandbox y en el recibo del sistema. No llamar a fondos Sandbox dinero real.

Si los payouts aún no se han probado externamente, explicar que las asignaciones son el ledger de proveedores y que su envío está pendiente de verificación. Mostrar `PENDING` como pendiente; no convertirlo en éxito para el vídeo.

## Límites que refuerzan el relato

La experiencia nocturna se realiza en un lugar permitido cercano con equipo del proveedor. Las visitas públicas a telescopios del Roque de los Muchachos son diurnas. No existe alianza con el IAC por usar La Palma como escenario. Fuentes: [IAC](https://iac.es/es/observatorios-de-canarias/observatorio-del-roque-de-los-muchachos/visitas) y [Turismo de La Palma](https://visitlapalma.es/observacion-de-estrellas/la-palma/roque-de-los-muchachos/).

No usar «escrow», «smart contract de PayPal», «fondos devueltos instantáneamente», «predicción perfecta», «split atómico» ni «integración activa» para servicios planeados. La innovación demostrable es el control condicionado y trazable sobre la ejecución del pago.
