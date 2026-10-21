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
| 1:24–1:49 | Evaluar cielo válido y abrir evidencia | «Entramos en el escenario de cielo válido. Aquí están los valores, la antigüedad de la observación y la decisión de la política. La evidencia habilita el cobro; no lo decide una frase generada por el modelo». |
| 1:49–2:10 | Ejecutar y mostrar recibo y asignaciones | «La aplicación captura la autorización y registra el resultado. El reparto a guía, telescopio y transporte es una operación posterior: no fingimos que PayPal ofrece aquí un split atómico». |
| 2:10–2:36 | Nuevo acuerdo; rama de nubes o datos caducados | «Ahora cambia una sola cosa: la condición falla. No hay captura. Se solicita anular la autorización y queda registrada la razón. Un agente financiero también tiene que demostrar cuándo no mover dinero». |
| 2:36–2:50 | Mostrar recibo y cerrar con la visión | «Canarias es la primera historia. La infraestructura sirve para cualquier compra compleja: intención, compromiso, evidencia y pago. ASTERION: Intent. Evidence. Payment». |

## Variante verificada con PayPal Sandbox

Cambiar la frase de 1:04 por: «Esto es PayPal Sandbox: fondos de prueba y una aprobación real en el entorno de pruebas». Mostrar el dominio de Sandbox durante la aprobación y el ID de autorización retornado por PayPal. Después de capturar o anular, contrastar el resultado en la cuenta Sandbox y en el recibo del sistema. No llamar a fondos Sandbox dinero real.

Si los payouts aún no se han probado externamente, explicar que las asignaciones son el ledger de proveedores y que su envío está pendiente de verificación. Mostrar `PENDING` como pendiente; no convertirlo en éxito para el vídeo.

## Límites que refuerzan el relato

La experiencia nocturna se realiza en un lugar permitido cercano con equipo del proveedor. Las visitas públicas a telescopios del Roque de los Muchachos son diurnas. No existe alianza con el IAC por usar La Palma como escenario. Fuentes: [IAC](https://iac.es/es/observatorios-de-canarias/observatorio-del-roque-de-los-muchachos/visitas) y [Turismo de La Palma](https://visitlapalma.es/observacion-de-estrellas/la-palma/roque-de-los-muchachos/).

No usar «escrow», «smart contract de PayPal», «fondos devueltos instantáneamente», «predicción perfecta», «split atómico» ni «integración activa» para servicios planeados. La innovación demostrable es el control condicionado y trazable sobre la ejecución del pago.
