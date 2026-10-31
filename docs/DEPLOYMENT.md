# Operación, staging y rollback

## Configuración

- Node 24.22.2 LTS y `npm ci`; Next 16.4.3 / React 19.3.1 con lockfile.
- Supabase separado por entorno. `DATABASE_URL` con TLS y permiso de asumir service_role; conexión/pool compatible con transacciones. Secrets en el gestor del hosting.
- Migrar con `node --env-file=.env.local --import tsx scripts/migrate.ts`. Cada migración se registra. Seed no sobrescribe precios.
- Auth: URL HTTPS, redirect `/auth/confirm`, SMTP y Google opcional. Verificar registro, confirmación, recuperación y refresh con dos cuentas reales de staging.
- Storage privado `pixvo-private`. Servidor inspecciona bytes y vuelve a codificar imágenes sin EXIF. Audio/video se identifican por firma; no hay transcodificación ni antivirus.
- Proxy: límite de cuerpo 51 MB, timeout suficiente y cabecera de IP sobrescrita. TRUST_PROXY=true solo con origen inaccesible directamente. Límites PostgreSQL: RSVP 12/min/IP/evento, canciones 5/min, Auth 30/5min.

## Mercado Pago Checkout Pro

Se usa **Preferences API** (`/checkout/preferences`) y consulta `/v1/payments/:id`, sin mezclar contratos de Orders API. Crear preferencia no ejecuta cobros desde el servidor.

1. Configurar precios positivos en centavos ARS y beneficios en `/admin`. Null bloquea checkout.
2. Staging: MERCADOPAGO_ENV=sandbox, access token y collector de pruebas, webhook secret y URL HTTPS. Registrar `/api/webhooks/mercadopago`, eventos payment.
3. Activar PAYMENTS_ENABLED=true solo en ese entorno. Comprar con comprador/tarjeta de prueba. No usar cuentas ni tarjetas reales para verificar implementación.
4. Verificar firma, consulta al proveedor, collector, live_mode=false, orden/external_reference, importe y moneda. Cubrir aprobado, pendiente, rechazado, duplicado, concurrencia, devolución y contracargo.
5. La firma incluye data.id de query normalizado, x-request-id y ts; ventana de cinco minutos. Un reintento viejo requiere nueva entrega firmada o reconciliación controlada.
6. Confirmar que parámetros de retorno del navegador no dan derechos. Reabrir editor después de verificar el pago y publicar explícitamente.

El webhook responde éxito después de la transacción. Fallos temporales devuelven error para reintento del proveedor. No guarda cuerpos completos ni tarjetas. Webhook_events registra entregas procesadas.

Órdenes conservan precio/beneficios. Preferencia se crea bajo bloqueo y se reutiliza enviando X-Idempotency-Key. Si el proceso cae después de crearla y antes de guardarla, reconciliar por external_reference antes de habilitar un nuevo intento. La idempotencia de creación de preferencias requiere comprobación en sandbox. Pagos y derechos tienen además claves únicas, bloqueo y transacción local.

Devolución/contracargo confirmado pausa el evento cuyo derecho corresponde a esa orden y registra revisión requerida. No borra versiones, medios ni RSVP. La política comercial definitiva requiere decisión del titular; el panel no inicia devoluciones.

## Publicación y seguridad

Snapshot inmutable por publicación. Autosave no altera lo activo ni consume ediciones. Republicación distinta consume una; repetir snapshot no consume otra. Rollback autorizado conserva RSVP y no consume cupo. URL fija desde primera publicación.

Proyección pública elimina bloques desactivados y propiedades ajenas al tipo. No serializa propietarios, órdenes, respuestas, tokens ni borradores. Archivos privados se sirven solo al propietario o por referencia publicada activa. No-store evita caché de datos privados y refleja pausa/vencimiento inmediatamente.

## Puerta de lanzamiento

`npm ci` → lint → typecheck → unit/integración → build → migraciones aditivas → staging → E2E con Supabase/MP sandbox → revisión → producción autorizada.

Pendiente del titular: contacto, precios definitivos, términos de compra, privacidad con responsable/contacto/derechos, retención/borrado, cancelaciones y soporte. La página actual lo indica; no es una política comercial final. Mantener PAYMENTS_ENABLED=false hasta completar estas decisiones y sandbox.

Verificar desde otro dispositivo: QR, correo, 360/390/768/1440 px, uploads detrás del proxy y audio/video en iOS/Android. Chromium local no certifica todos esos entornos.

## Respaldo y limpieza

Activar backups PostgreSQL/PITR según plan y respaldo separado del bucket. Ensayar restauración en staging. Conservar todo archivo referenciado por versiones publicadas. Retirar marca el medio como deleted; no hay borrado irreversible automático. Para huérfanos: inventariar objetos sin fila/referencias, respetar período de gracia y cruzar version_media y todos los borradores. Programar limpieza auditada cuando se acuerde retención.

## Rollback

- Deshabilitar checkouts con PAYMENTS_ENABLED=false durante incidente; conservar órdenes y revisar webhooks pendientes.
- Volver al release anterior compatible, sin down migrations destructivas.
- Restaurar snapshot desde Revisar y publicar; conserva borrador y respuestas.
- Monitorear 5xx/429, publicación, uploads y discrepancias de pagos. Logs de app no incluyen SQL, tokens ni payloads.
- Ensayar rollback y restauración antes de producción. Esta tarea no realizó despliegues.

## Fuentes oficiales consultadas (2026-10-31)

- [Next instalación](https://nextjs.org/docs/app/getting-started/installation)
- [Node LTS](https://nodejs.org/en/about/previous-releases), [checksums v24](https://nodejs.org/download/release/latest-v24.x/SHASUMS256.txt)
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage](https://supabase.com/docs/guides/storage/security/access-control)
- [MP preferencias](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-preferences/create-preference/post), [firma webhook](https://www.mercadopago.com.ar/developers/en/docs/zero-dollar-auth/additional-content/your-integrations/notifications/webhooks)
- [PGlite](https://pglite.dev/docs/)

## Hostinger y muestras personalizadas

El auto-despliegue de Hostinger usa main y el dominio invitaciones.pixvo.tech, según configuración confirmada por el titular el 2026-10-31. El comando de producción escucha en 0.0.0.0 y usa PORT cuando el hosting lo define (3000 por defecto). No habilitar el adaptador local en producción ni modificar secretos como efecto secundario de actualizar muestras.

Rollback de esta actualización: volver al último commit con despliegue exitoso desde hPanel, o revertir el commit de publicación de main y dejar que el auto-despliegue regenere el release. No borrar tablas ni respuestas. Las muestras añaden únicamente un campo opcional del documento; los snapshots previos siguen siendo compatibles.
