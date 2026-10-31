# Modelo y contratos propuestos
## Tablas
| Tabla | Campos principales | Restricciones |
|---|---|---|
| profiles | id(auth), display_name, role | rol admin no editable por usuario |
| templates | id, version, category, config, active | unique(id,version), lectura catálogo activo |
| plans | id, price_minor, currency, entitlements, active | precio configurado antes de cobrar |
| invitations | id, owner_id, slug, draft_json, revision, published_version_id, status, expires_at | slug único; owner FK |
| invitation_versions | id, invitation_id, number, document_json, created_at | inmutable; unique(event,number) |
| media | id, owner_id, event_id, storage_key, mime, bytes, state | autorización y cuota |
| guest_parties | id, event_id, token_hash, max_attendees, label | token hash único, no nombre como clave |
| rsvps | id, event_id, guest_party_id, response, attendees, optional_answers, version | unique(event,guest_party), cantidad >=0 |
| song_requests | id, event_id, title, artist, link, created_at | límites y moderación |
| orders | id, owner_id, invitation_id, plan_snapshot, amount_minor, currency, status | importe calculado por servidor |
| payments | id, order_id, provider_id, status, amount_minor, currency | provider_id único |
| webhook_events | provider_event_id, received_at, processed_at, result | deduplicación idempotente |
| audit_log | actor_id, action, entity_id, timestamp, metadata | append-only desde servidor |
| custom_requests | owner_id, brief, state, assigned_admin | privada |

Todas las filas privadas se filtran por propietario directo o mediante invitación. Las políticas deben probarse con dos usuarios reales de prueba. RSVP público no tiene lectura global. Acciones admin verifican rol servidor y generan auditoría.

## Endpoints / acciones servidor
| Método/ruta | Entrada | Salida/regla |
|---|---|---|
| GET /api/templates | category, cursor | templates activos paginados |
| POST /api/invitations | templateId, category | id + revision; owner de sesión |
| GET /api/invitations/:id | sesión | borrador solo propietario |
| PATCH /api/invitations/:id | document, expectedRevision | revision nueva; 409 si conflicto |
| POST /api/invitations/:id/duplicate | sesión | nuevo borrador sin invitados ni pagos |
| POST /api/media/upload-url | eventId,mime,size | upload firmado tras autorización |
| POST /api/media/:id/complete | checksum | validación real del archivo |
| POST /api/orders | eventId,planId | orden, amount servidor |
| POST /api/orders/:id/checkout | sesión | URL checkout asociada a orden |
| POST /api/webhooks/mercadopago | firma + cuerpo proveedor | procesamiento idempotente |
| POST /api/invitations/:id/publish | expectedRevision | snapshot + URL; solo con derecho activo |
| POST /api/invitations/:id/rollback | versionId | restaurar publicación autorizada |
| GET /api/public/:slug | token opcional | documento saneado, estado vigente |
| POST /api/public/:slug/rsvp | token/nonce,response,attendees,fields | recibo y token de actualización |
| POST /api/public/:slug/songs | title,artist,url | recibo, límites |
| GET /api/invitations/:id/rsvps | cursor,filters | solo propietario/admin |
| GET /api/invitations/:id/export.csv | filters | CSV seguro; no cache público |
| POST /api/custom-requests | brief | encargo privado |

Errores: 400 entrada, 401 sesión, 403 permiso/entitlement, 404 inexistente/no accesible, 409 revisión/slug, 413 tamaño, 422 validación, 429 tasa, 503 proveedor temporal. No exponer stack traces al cliente.

## Publicar y pagar
1. Crear orden inmutable con precio y beneficios actuales.
2. Crear checkout con external_reference interno, idempotencia y URLs permitidas.
3. Webhook: verificar firma según proveedor, obtener pago por API, comprobar merchant/orden/importe/moneda/estado; transaction y unique provider_id.
4. Activar derecho una sola vez. Un retorno success del browser no concede acceso.
5. Publicar valida documento, medios y revisión; snapshot + contador de ediciones atómicos.
6. Reembolsos/contracargos requieren política explícita y registro; no borrar eventos automáticamente.
Tokens de invitado y edición: aleatorios de alta entropía, almacenados con hash, rotables y con alcance a un evento. No usar IDs secuenciales como secreto.

## Contrato de la implementación actual

El cuadro anterior es el diseño inicial. La aplicación usa estas rutas concretas adicionales o ajustadas:

- POST /api/auth/login, /register, /recover, /password, /logout y /google. GET /auth/confirm acepta código PKCE o token_hash/tipo permitido. GET /api/auth devuelve usuario autenticado y si es desarrollo local.
- POST /api/invitations/:id/media recibe multipart (file, authorized=true). El servidor limita bytes, inspecciona formato, decodifica imágenes y escribe al bucket privado. Reemplaza el esquema de upload-url/complete propuesto para evitar publicar archivos sin procesar.
- GET /api/invitations/:id/media lista metadatos privados. GET /api/media/:id autoriza propietario o referencia publicada con ?slug=; soporta Range. DELETE retira de biblioteca solo si no hay referencias en borradores/snapshots.
- POST /api/invitations/:id/status: draft/paused/archived; POST /guests crea enlace personal, mostrando su token una sola vez; GET /versions y /songs son privados.
- GET /api/invitations/:id/rsvps y /export.csv aceptan response=yes|no|pending y q. El mismo filtro se aplica al CSV.
- GET /api/public/:slug/calendar produce ICS. POST /rsvp devuelve recibo/token para actualizar, con datos validados contra snapshot activo y cupos bajo bloqueo.
- GET /api/orders lista órdenes del propietario; POST /api/orders y /:id/checkout calculan el importe en servidor. Retornos del navegador no mutan pagos.
- GET /api/admin ofrece planes, templates, eventos, órdenes, encargos y auditoría solo a admin. POST /api/admin/plans, /templates, /events y /requests valida cambios y genera audit_log. No hay aprobación manual de pagos.
- PATCH /api/profile edita display_name; nunca role. Encargos GET/POST /api/custom-requests son privados.

Las tablas adicionales version_media y rate_limits protegen referencias publicadas y antiabuso. local_dev.users/sessions existen exclusivamente en el adaptador local; Supabase usa auth.users. El schema JSON se genera desde Zod con scripts/generate-schema.ts; las refinaciones semánticas (zona IANA, orden temporal, capacidades y referencias) se aplican además en servidor.
