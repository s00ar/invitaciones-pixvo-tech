# Operación, staging y rollback

## Configuración

- Node 24.22.2 LTS y `npm ci`; Next 16.4.3 / React 19.3.1 con lockfile.
- Supabase separado por entorno. `DATABASE_URL` con TLS y permiso de asumir service_role; conexión/pool compatible con transacciones. Secrets en el gestor del hosting.
- TLS PostgreSQL: la CA pública `certs/supabase-root-2021.crt` se aplica por defecto solo a `*.pooler.supabase.com` y `db.<ref>.supabase.co`. Se verifica certificado y hostname (`rejectUnauthorized=true`); runtime, migrate y seed comparten configuración. La CA está incluida explícitamente en el trazado Next.js y `npm run verify:certificate` valida el artefacto tras el build. No requiere una variable nueva para el certificado habitual. `DATABASE_SSL_CA` permite sustituirla con otra CA autorizada (PEM multilínea o con `\n` literales); se rechazan contenido inválido y certificados de cliente simultáneos. Al usar CA explícita se evitan los parámetros SSL de URI que sobrescriben la configuración en pg. Sin CA explícita y fuera de Supabase se conserva el comportamiento del driver. El aviso de `sslmode=require` se evita usando `verify-full`; ese cambio de nombre por sí solo no agrega una CA faltante. Ante rotación, descargar la CA de Database Settings → SSL Configuration, validar y actualizar la configuración. No desactivar validación global de TLS.
- Migrar con `node --env-file=.env.local --import tsx scripts/migrate.ts`. Cada migración se registra. Seed no sobrescribe precios.
- Alternativa sin compartir credenciales: Supabase **SQL Editor → New query**, ejecutar `supabase/bootstrap.sql` completo. Se genera con `npm run db:bootstrap-sql` a partir de las mismas migraciones y seed. Usa transacción y bloqueo; registra migraciones para ser compatible con el runner; repeticiones no sobrescriben ajustes. Ante tablas ajenas o un esquema parcial sin historial, aborta sin aplicar cambios. Resultado esperado en una base nueva: 27 templates, 3 planes, 4 migraciones. Solicita recarga del schema cache de PostgREST al terminar. Validar después `/api/plans` y portada; si sigue habiendo 500, revisar Runtime logs y `DATABASE_URL` (contraseña codificada, sesión/TLS) sin publicar secretos.
- Auth: URL HTTPS, redirect `/auth/confirm`, SMTP y Google opcional. Verificar registro, confirmación, recuperación y refresh con dos cuentas reales de staging.
- Google: seguir [GOOGLE-AUTH.md](GOOGLE-AUTH.md), habilitar el proveedor y configurar Client ID/Secret en Supabase. El callback autorizado en Google es el de Supabase `/auth/v1/callback`; el retorno a Pixvo es `/auth/confirm`. Construcción de callbacks normalizada para variables con o sin barra final.
- Storage privado `pixvo-private`. Servidor inspecciona bytes y vuelve a codificar imágenes sin EXIF. Audio/video se identifican por firma; no hay transcodificación ni antivirus.
- Proxy: límite de cuerpo 51 MB, timeout suficiente y cabecera de IP sobrescrita. TRUST_PROXY=true solo con origen inaccesible directamente. Límites PostgreSQL: RSVP 12/min/IP/evento, canciones 5/min, Auth 30/5min.

## Mercado Pago Checkout Pro

Se usa **Checkout Pro con Orders API** (`POST /v1/orders`, `GET /v1/orders/:id`). El panel de creación anuncia la discontinuación próxima de Preferences; no se presupone una fecha. Seguir [MERCADOPAGO.md](MERCADOPAGO.md) para crear la aplicación y configurar los campos. Crear una order devuelve un checkout; no ejecuta un cobro por sí mismo.

1. Aplicar `202610310003_commercial_prices.sql` con el runner de migraciones: configura Básica $35.000, Interactiva $60.000 y Premium $100.000 ARS (centavos en base de datos), y habilita audio para nuevas compras de Básica. Nombres/IDs: standard → básica, premium → interactiva, custom → premium. No cambia snapshots de órdenes previas. El seed crea planes con estos valores y conserva ajustes administrativos posteriores; la migración se ejecuta una sola vez. Null sigue bloqueando checkout.
2. Aplicar `202611010004_mercadopago_orders.sql` con el runner o ejecutar nuevamente el bootstrap completo en SQL Editor. Es aditiva; conserva preferencias anteriores, historial, invitaciones y RSVP. Resultado del bootstrap: 27 templates, 3 planes, 4 migraciones (los conteos anteriores 27/3/3 corresponden a la versión previa).
3. Staging: MERCADOPAGO_ENV=sandbox, Access Token y collector del vendedor de Prueba, webhook secret del mismo entorno y URL HTTPS. Registrar `/api/webhooks/mercadopago`, evento **Order (Mercado Pago)**. Los Access Tokens de prueba de esta API también empiezan con APP_USR; el prefijo no determina el entorno.
4. Activar PAYMENTS_ENABLED=true solo en staging. Comprar con comprador/tarjeta de prueba. No usar cuentas ni tarjetas reales para verificar implementación.
5. Verificar firma y consultar la order al proveedor. La cuenta del Access Token se verifica por `/users/me` (API Mercado Libre documentada por Mercado Pago), comprobando id y tag test_user frente al entorno esperado. La respuesta de Orders no documenta live_mode; no se inventa ni se confía solo en el cuerpo del webhook. También se comparan order persistida, external_reference, user_id, currency, total_amount y, para aprobar, total_paid_amount. Cubrir aprobado, pendiente, rechazado, duplicado, concurrencia, devolución y contracargo.
6. La firma incluye data.id de query normalizado, x-request-id y ts; ventana de cinco minutos. Un reintento viejo requiere nueva entrega firmada o reconciliación controlada. Hay compatibilidad para notificaciones payment de órdenes anteriores, con consulta `/v1/payments/:id` y validación live_mode; no pueden acreditar una orden vinculada a Orders.
7. Confirmar que parámetros de retorno del navegador no dan derechos. Reabrir editor después de verificar el pago y publicar explícitamente.

El webhook responde éxito después de la transacción. Fallos temporales devuelven error para reintento del proveedor. No guarda cuerpos completos ni tarjetas. Webhook_events registra entregas procesadas.

Órdenes conservan precio/beneficios. La order del proveedor se crea bajo bloqueo y con X-Idempotency-Key igual al UUID local; checkout_url e ID quedan asociados a un entorno y se reutilizan. Se usan montos decimales como strings y retornos config.online normalizados. client_token no se persiste ni se devuelve. Ante caída después de crear y antes de guardar, reintentar con la misma clave; reconciliar por external_reference si el proveedor no conserva esa idempotencia. Su comportamiento externo requiere comprobación en sandbox. Pagos y derechos tienen además claves únicas, bloqueo y transacción local. Un checkout anterior con preference_id requiere revisión antes de abrir un nuevo intento; no se transforma ni duplica automáticamente.

Devolución total o parcial y contracargo confirmado pausan el evento cuyo derecho corresponde a esa orden y registran revisión requerida. No borran versiones, medios ni RSVP. La política comercial definitiva requiere decisión del titular; el panel no inicia devoluciones. Estados viejos no revierten una actualización más reciente. Las devoluciones parciales siguen una pausa conservadora para revisión, no una reactivación automática.

## Publicación y seguridad

Snapshot inmutable por publicación. Autosave no altera lo activo ni consume ediciones. Republicación distinta consume una; repetir snapshot no consume otra. Rollback autorizado conserva RSVP y no consume cupo. URL fija desde primera publicación.

Proyección pública elimina bloques desactivados y propiedades ajenas al tipo. No serializa propietarios, órdenes, respuestas, tokens ni borradores. Archivos privados se sirven solo al propietario o por referencia publicada activa. No-store evita caché de datos privados y refleja pausa/vencimiento inmediatamente.

## Puerta de lanzamiento

`npm ci` → lint → typecheck → unit/integración → build → migraciones aditivas → staging → E2E con Supabase/MP sandbox → revisión → producción autorizada.

Los tres precios base fueron aprobados por el titular. Pendiente: alcance/cotización de adicionales, contacto, términos de compra, privacidad con responsable/contacto/derechos, retención/borrado, cancelaciones y soporte. La página actual lo indica; no es una política comercial final. Mantener PAYMENTS_ENABLED=false hasta completar estas decisiones y sandbox. Google Sheets no tiene conector implementado; se muestra pendiente y las respuestas permanecen en Pixvo con exportación CSV.

Verificar desde otro dispositivo: QR, correo, 360/390/768/1440 px, uploads detrás del proxy y audio/video en iOS/Android. Chromium local no certifica todos esos entornos.

## Respaldo y limpieza

Activar backups PostgreSQL/PITR según plan y respaldo separado del bucket. Ensayar restauración en staging. Conservar todo archivo referenciado por versiones publicadas. Retirar marca el medio como deleted; no hay borrado irreversible automático. Para huérfanos: inventariar objetos sin fila/referencias, respetar período de gracia y cruzar version_media y todos los borradores. Programar limpieza auditada cuando se acuerde retención.

## Rollback

- Deshabilitar checkouts con PAYMENTS_ENABLED=false durante incidente; conservar órdenes y revisar webhooks pendientes.
- Volver al release anterior compatible, sin down migrations destructivas.
- En una reversión del adaptador Orders, mantener PAYMENTS_ENABLED=false y reconciliar las órdenes creadas con ese contrato antes de volver a aceptar pagos. Conservar la migración 004 y el historial; un release antiguo no procesa las notificaciones de Orders.
- Restaurar snapshot desde Revisar y publicar; conserva borrador y respuestas.
- Monitorear 5xx/429, publicación, uploads y discrepancias de pagos. Logs de app no incluyen SQL, tokens ni payloads.
- Ensayar rollback y restauración antes de habilitar ventas. La actualización de main mediante el auto-despliegue de Hostinger fue autorizada por el titular el 2026-10-31; su resultado se registra en IMPLEMENTATION-STATUS.md.

## Fuentes oficiales consultadas (2026-10-31)

- [Next instalación](https://nextjs.org/docs/app/getting-started/installation)
- [Node LTS](https://nodejs.org/en/about/previous-releases), [checksums v24](https://nodejs.org/download/release/latest-v24.x/SHASUMS256.txt)
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage](https://supabase.com/docs/guides/storage/security/access-control)
- [MP preferencias](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-preferences/create-preference/post), [firma webhook](https://www.mercadopago.com.ar/developers/en/docs/zero-dollar-auth/additional-content/your-integrations/notifications/webhooks)
- [PGlite](https://pglite.dev/docs/)

## Hostinger y muestras personalizadas

El auto-despliegue de Hostinger usa main y el dominio invitaciones.pixvo.tech, según configuración confirmada por el titular el 2026-10-31. El comando de producción escucha en 0.0.0.0 y usa PORT cuando el hosting lo define (3000 por defecto). No habilitar el adaptador local en producción ni modificar secretos como efecto secundario de actualizar muestras.

Rollback de esta actualización: volver al último commit con despliegue exitoso desde hPanel, o revertir el commit de publicación de main y dejar que el auto-despliegue regenere el release. No borrar tablas ni respuestas. Las muestras añaden únicamente un campo opcional del documento; los snapshots previos siguen siendo compatibles.
