# Relevamiento verificable
Fecha: 2026-10-31. Fuentes: landing https://somosweb.ar/invitaciones/, catálogo https://invita.somosweb.ar/templates y marca https://pixvo.tech/.

## Método y cobertura
Se inspeccionó el catálogo público en navegador y el HTML público de las 27 previews. `research/public-previews.json` registra URL, títulos, controles, estilos inline y medios por template. No se descargaron bundles de aplicación ni se inspeccionaron endpoints privados.
Se revisaron en navegador Editorial Minimal, Glam Pink, Luxury Black, Disco, La Jungla, Minimalista Negro y Mi estilo XV. No equivale a probar las 27 variantes en todos los dispositivos.
Personalizar en Editorial Minimal redirigió a `/login?redirect=%2Flogin`. Se observó login por Google, email/contraseña, recuperación y registro. No se creó cuenta.
Al pulsar Sí, confirmo en la preview Editorial Minimal no apareció un formulario ni confirmación visible. No se puede verificar persistencia del RSVP por esa demo.

## Observado
27 entradas: 6 bodas, 6 XV, 4 fiestas, 7 infantiles y 4 corporativas. Catálogo con filtros, badge de plan, preview y acción Personalizar.
Las previews inspeccionadas contienen título, cuenta regresiva, fecha/hora, lugar, mensaje y botones de aceptar/rechazar. Hay diferencias entre nombres comerciales y slugs: Superhéroes usa space-explorer; Tech Cyan usa luxury-brand. El catálogo Pixvo conserva la correspondencia explícita.

## Anunciado en landing; no probado end-to-end
Estándar ARS 18.900, Premium ARS 34.900 y personalizado ARS 95.000. Valores del competidor observados en esa fecha, NO precios de Pixvo.
Pago único con Mercado Pago, duración hasta el evento. Estándar: datos, contador, RSVP WhatsApp, mapa y link. Premium agrega fondo de video, Spotify, galería, QR, vestimenta, regalos y tres ediciones. Personalizado anuncia entrega en 72 horas y ediciones ilimitadas. Se mencionan calendario, Instagram y sugerencias musicales.
No se verificó qué cuenta como edición, la retención posterior al evento, disponibilidad real de videos, cómo se administran respuestas ni la implementación del pago.

## Propuesta Pixvo
Editor por bloques, autosave, versiones publicadas, permisos por propietario, RSVP persistente, CSV, gestión de invitados, auditoría y administración son requisitos propuestos. No se afirma que reproduzcan el panel privado de Somos Web.
Precios, límites, contacto comercial, moneda fuera de Argentina y permanencia se configuran antes del lanzamiento. No copiar condiciones ni precios del competidor como decisión aprobada.

## Medios y limitación de paridad
Las imágenes públicas de referencia se inventarían en research/asset-manifest.json con checksum. Su licencia comercial NO está verificada. Los 27 SVG nuevos son sustitutos iniciales propios y no reproducciones exactas de esas fotografías/ilustraciones.
La paridad completa con un backend o editor privado no se puede certificar con acceso público. El objetivo implementable es cubrir todos los requisitos documentados con diseño Pixvo.
