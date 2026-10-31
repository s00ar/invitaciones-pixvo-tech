# Producto propuesto
Toda esta especificación es una PROPUESTA para Pixvo, salvo referencias señaladas como observadas.

## Roles y pantallas
| Actor | Pantallas | Alcance |
|---|---|---|
| Visitante | /, /templates, /preview/[id], /precios | Explorar y elegir |
| Organizador | /registro, /login, /recuperar, /app | Administrar sus eventos |
| Organizador | /app/invitaciones/nueva, /app/invitaciones/[id]/editar | Crear y personalizar |
| Organizador | /app/invitaciones/[id]/invitados, /respuestas, /compartir | RSVP, CSV, URL y QR |
| Organizador | /app/pagos, /app/perfil | Pagos y cuenta |
| Invitado | /i/[slug], /i/[slug]?guest=TOKEN | Invitación publicada y RSVP |
| Administrador | /admin/templates, /admin/planes, /admin/eventos, /admin/pagos | Operación con auditoría |

## Recorridos
- El catálogo conserva filtros en URL; datos iniciales ficticios en previews; ninguna preview envía respuestas reales.
- Crear desde un template conserva elección a través del registro/login; evitar el redirect genérico observado en la referencia.
- Dashboard con búsqueda, estados, última edición, fecha de evento y acciones editar/duplicar/archivar/compartir.
- Publicar exige datos válidos, entitlement activo y slug único. Permitir preview privada sin comprar.
- Duplicar evento copia configuración, no invitados, pagos ni respuestas.
- Invitados responden sin crear cuenta. Modal o sección accesible con nombre, asistencia, cantidad y campos opcionales configurables.
- Capacidad y acompañantes tienen límites en servidor. Respuestas repetidas actualizan su registro con token; no confiar en coincidencia de nombre.
- Enlace abierto y enlace por invitado son modos explícitos. En abierto, advertir al organizador que el link puede reenviarse y aplicar antiabuso.
- Exportación CSV UTF-8 y escape de fórmulas; filtros sí/no/pendiente y búsqueda; no publicar listas nominales.
- Personalizado: formulario de solicitud guardado, estado de encargo y entrega por admin; no inventar un SLA comercial.

## Planes configurables
Definir Standard, Premium y Custom, con nombres comerciales editables. Precio ARS null por defecto: UI muestra Consultar precio/configuración pendiente, no checkout a $0.
Entitlements: templates permitidos, cantidad de fotos, video, audio, galería, QR, edición de estilos, número de republicaciones y vigencia. Fijar precio/beneficios en snapshot de la orden.
Propuesta de regla: autosaves no consumen ediciones; solo republicación exitosa de cambios cuenta, atómicamente. Primera publicación no consume una edición. Un fallo de publicación no decrementa cupo.
Toda restricción debe aplicarse en servidor. Ocultar un botón no es control de acceso.

## Invitación pública
Portada, nombres/título, introducción, contador, agenda y sedes, mapa/enlace, guardar en calendario, galería, dress code, regalos (copiar alias/CBU), RSVP, sugerencia de canciones, Instagram/hashtag, pie Pixvo configurable por plan.
Los bloques vacíos u ocultos no generan huecos. Contador termina en cero con mensaje de evento iniciado. Fechas almacenadas como instante más zona IANA; es-AR por defecto y zona America/Argentina/Buenos_Aires editable.
QR apunta a la URL canónica publicada y debe escanearse desde otro dispositivo. Calendario ICS con escape, UTC/TZ y fin posterior al inicio; Google Calendar como opción adicional.

## Estados y errores
Borrador, pendiente de pago, listo para publicar, publicado, pausado, vencido, archivado. Pago separado: creado/pendiente/aprobado/rechazado/reembolsado/contracargo.
Manejar slug ocupado, sesión vencida, subida fallida, límite de plan, conflicto de edición, pago pendiente, evento vencido, RSVP cerrado y recurso eliminado. Nunca mostrar éxito cuando falla la persistencia.
