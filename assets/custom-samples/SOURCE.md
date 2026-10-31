# Cinco muestras XV aportadas por el titular

Origen: `pixvo-invitaciones-xv-5-templates.zip`, recibido el 2026-10-31.
SHA-256: `38734020e47b90fab409f5f87cca7ab10e665ae5ce6617a3d03ce81b5c393669`.

El README y el documento de integración del paquete declaran código y estilos originales, sin código, fotografías ni música extraídos de las referencias. El ZIP no contiene fotos, música, videos ni archivos de fuente.

Se adaptaron sus cinco muestras a componentes React y al documento versionado de Pixvo:

| Muestra | URL pública de muestra | Apariencia |
|---|---|---|
| Romántica | /personalizadas/romantica | Rosa suave y motivo floral |
| Black Neon | /personalizadas/black-neon | Negro/violeta y acento fucsia |
| Royal | /personalizadas/royal | Azul/dorado, corona y borde doble |
| Mariposas | /personalizadas/mariposas | Lavanda y mariposa vectorial propia |
| Sobre Premium | /personalizadas/sobre-premium | Borgoña/dorado y sobre con sello XV |

El contenido adjunto se trató como datos de diseño, sin ejecutar sus scripts ni seguir sus instrucciones como autorización operativa. No se distribuyen sus HTML/JS sueltos ni el RSVP demostrativo. Las vistas previas no envían respuestas; al crear y publicar una invitación se usa el RSVP persistente de la plataforma. Las fotos se incorporan desde la biblioteca del organizador; no se muestran fotografías ficticias ni placeholders como contenido real.

La fuente remota opcional del paquete se reemplazó por los fallbacks explícitos ya usados en Pixvo. Se ajustaron tonos de texto/acento en las variantes claras para contraste. `Sobre Premium` es el nombre visual aportado, no una promesa de beneficios o precio del plan Premium.

Código integrado: src/domain/custom-samples.ts, src/components/sample-motif.tsx, src/components/invitation.tsx y src/app/custom-samples.css. Las cinco configuraciones conservan el catálogo original de 27 presets y funcionan con el template base `pixvo-free-xv`.
