# Evidencias de QA

Capturas generadas con Chromium y datos ficticios en la base de tests aislada.

- landing-desktop.png: portada comercial Pixvo.
- catalogo.png: catálogo filtrado por XV.
- editor-desktop.png y editor-mobile.png: mismo documento en editor y vista de 390 px.
- publicacion.png: enlace público y QR del snapshot.
- invitacion-publica.png: confirmación persistida desde contexto de invitado separado.
- respuestas.png: panel privado de RSVP.

El QR se decodifica automáticamente y coincide con la URL abierta desde otro contexto de navegador. No se comprobó todavía el escaneo con cámara física ni Safari/iOS. Las comprobaciones axe se ejecutan en landing, catálogo, login y preview; no certifican por sí solas toda la accesibilidad de contenido personalizado por clientes.

Las rutas localhost de las capturas pertenecen al servidor de test efímero en puerto 3001. Los pagos usados en ese recorrido son fixtures; no son una transacción de Mercado Pago sandbox.
