# Editor propuesto
## Disposición
Desktop: navegación de bloques izquierda, canvas central, inspector derecho; barra con título, guardado, deshacer/rehacer, viewport, preview y publicar. Mobile: canvas y panel inferior en tabs; controles táctiles accesibles.

## Campos editables
| Grupo | Campos / reglas |
|---|---|
| Evento | categoría, título, anfitriones, mensaje, inicio/fin, zona, fecha límite RSVP |
| Estilo | paleta, título/body de lista segura, escala tipográfica, radios, espaciado, alineación |
| Fondo | SVG propio, imagen, video, color/gradiente; foco x/y, recorte, overlay y poster |
| Ubicaciones | nombre, dirección, hora, URL Maps validada; múltiples sedes |
| Galería | upload, ordenar, alt, leyenda, borrar y recorte no destructivo |
| Audio | archivo autorizado con play/pause; volumen y estado inicial apagado; Spotify link/embed separado |
| Vestimenta | etiqueta, detalle, colores sugeridos, imagen opcional |
| Regalos | texto, alias/CBU, titular opcional, enlace de lista; ocultar datos si bloque desactivado |
| RSVP | modalidad, cupos, campos opcionales, cierre, WhatsApp adicional |
| Agenda | hora, título y descripción de cada actividad |
| Social | Instagram, hashtag y mensaje para compartir |
| SEO social | título, descripción y tarjeta OG; no index por defecto |

## Operaciones
Documento con schemaVersion, templateVersion y revision. Autosave con debounce propuesto de 800 ms y estados Guardando/Guardado/Sin conexión/Error. Cola local de recuperación con aviso: no sustituye base remota. Comprobar revisión para no pisar cambios entre pestañas (409).
Undo/redo local hasta 50 operaciones; guardar snapshot antes de cambiar template. Reordenar también con teclado; solo los bloques declarados repetibles admiten duplicación. Secciones obligatorias protegidas.
Al cambiar plantilla, mapear contenido semántico; mantener medios y RSVP. Cambios incompatibles requieren una confirmación específica mostrando qué se pierde.
Vista previa usa el renderer público con documento de borrador y marcas Preview; botones de RSVP/pago no transmiten datos. Preview no indexable y privada con acceso firmado/expiración.
Publicación crea snapshot inmutable dentro de transacción; rollback cambia publishedVersionId a una versión previa autorizada sin perder respuestas. Assets de versiones publicadas se conservan mientras existan referencias.

## Seguridad de edición
No aceptar HTML/JS/CSS arbitrario. Colores hex validados, enums para fuentes/layouts, límites de texto/array. URLs HTTPS permitidas, bloqueo javascript/data en enlaces. SVG subido por usuarios se rechaza inicialmente; los SVG propios del repositorio son recursos estáticos confiables.
Subidas implementadas: JPEG/PNG/WebP hasta 10 MB, MP4/WebM hasta 10 MB y MP3 hasta 15 MB; cuota total de 250 MB por evento. MB equivale a 1.000.000 bytes. El navegador avisa antes de enviar y permite volver a seleccionar el mismo archivo; el servidor inspecciona bytes y aplica el límite del formato detectado, sin confiar en extensión o MIME declarado. El cuerpo multipart se limita a 16.000.000 bytes, incluyendo margen para el formulario. Los archivos previamente guardados conservan su acceso y referencias.

La guía de video aparece en Archivos y junto a Video de fondo: MP4 con H.264/AAC recomendado, WebM alternativo, 720p/1080p, 30 FPS, SDR y peso de 5–10 MB. Vertical 9:16 para móvil y horizontal 16:9 para escritorio. El mismo archivo se recorta según la portada; el foco se ajusta en Estilo y diseño. 10–20 segundos es una recomendación para fondos, no una restricción de duración. Los codecs no se convierten ni se garantiza compatibilidad únicamente por la extensión.
