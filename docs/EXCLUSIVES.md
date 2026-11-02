# Invitaciones exclusivas

Diseño floral marfil/oro con sobre animado, apertura por gesto, música, cuenta regresiva, mapa, calendario, formulario familiar, alimentación, canciones y alias. `/exclusivas/[slug]` exige un evento publicado activo. `/exclusivas/[slug]/preview` exige la cuenta propietaria en producción. El preview local usa `.data/azul/brief.json`, ignorado por Git, y no guarda respuestas. Los datos reales del evento, correo, teléfono y música no se versionan en el repositorio público.

## Preparación y puesta en servicio

1. Aplicar las migraciones `202611020006_exclusives.sql` y `202611020007_storage_audio.sql` mediante el runner existente o SQL revisado. No se ejecutan al arrancar producción. Conservan las respuestas anteriores. Los grupos sin límite usan `max_attendees=null`; otros eventos siguen verificando sus cupos.
2. Ejecutar `scripts/prepare-azul.ts` con credenciales de operador en el entorno y `EXCLUSIVE_SLUG`, `AZUL_OWNER_EMAIL`, `AZUL_NOTIFY_WHATSAPP`, `AZUL_BRIEF_FILE` (documento privado validado) y opcionalmente `AZUL_AUDIO_FILE` (M4A inspeccionado). La cuenta debe existir. El script no crea usuarios, pagos ni derechos, no publica y no sobrescribe un evento existente. La música se sube al almacenamiento privado y se referencia desde el borrador.
3. El panel propietario muestra «Ver diseño exclusivo» y las respuestas existentes del evento. Otros usuarios no pueden leer su borrador ni sus respuestas. Los enlaces `/i/[slug]` publicados redirigen al diseño exclusivo.
4. Revisar el diseño y luego publicar por el flujo autorizado existente; no se agregaron pagos ficticios ni excepciones comerciales. La vista previa no es una URL pública para invitados.

## Confirmaciones y avisos

La respuesta persiste antes de ofrecer WhatsApp. El enlace `wa.me` se genera en servidor con el destinatario privado del evento y un resumen (nombre, asistencia, cantidad, integrantes); no se abre ni envía automáticamente. El usuario pulsa «Avisar a Vero por WhatsApp» y luego «Enviar» en WhatsApp. No se exige API Business. Nunca se presenta el clic como entrega confirmada.

Cada versión distinta de una respuesta crea un aviso de correo en una cola transaccional. Reenviar el mismo contenido con el mismo token no agrega avisos; modificar la respuesta conserva el grupo. Los destinatarios no vienen del navegador. El correo va a la organización; no se recoge email del invitado ni se promete un correo al invitado.

Proveedor preparado: Resend HTTP API (https://resend.com/docs/api-reference/emails/send-email). Requiere `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL` de un dominio verificado y `RSVP_NOTIFICATIONS_ENABLED=true`, solo en servidor. Sin configuración, la cola permanece pendiente y el panel lo informa. No modificar el SMTP de autenticación de Supabase para habilitar estos mensajes: son flujos diferentes.

Se intenta despachar después de responder, sin bloquear la confirmación. Programar `node --import tsx scripts/dispatch-notifications.ts` para vaciar pendientes tras reinicios. El proveedor recibe clave de idempotencia. Estados: pendiente, procesando, aceptado por proveedor, fallido e incierto. Errores ambiguos y procesos abandonados requieren revisar el proveedor antes de reintentar; no se reenvían ciegamente. «Aceptado» no certifica entrega. No se hicieron envíos reales durante el desarrollo.

## Recursos y límites

Fondo original generado con imagegen incorporado, convertido a WebP (~220 KB). Prompt: fondo vertical de papelería marfil con centro vacío, seda gris cálida, rosas marfil con rosa vintage sutil, gypsophila y detalles de oro envejecido; sin texto ni logos. Fuente Great Vibes de Google Fonts, licencia OFL adjunta en assets. Música aportada por el titular, conservada fuera de Git: AAC 128 kb/s, 2:56, remultiplexada a M4A faststart sin recodificar (~2,85 MB). La muestra con extensión `.mp3` era realmente MP4/AAC. Inicio por gesto, carga diferida, pausa y aviso de error.

Sin límite comercial de personas por familia; se admiten enteros positivos dentro de la representación de PostgreSQL. El detalle de integrantes admite 1000 caracteres y alimentación 500; no se prometen formularios de tamaño infinito. Los registros de prueba usan datos ficticios y una base local aislada.

Rollback: mantener las migraciones aditivas y compatibilidad con `unlimitedAttendees`. No borrar eventos, respuestas, medios ni colas. Volver al código anterior pierde el diseño exclusivo y la presentación de WhatsApp, pero los datos siguen conservados.
