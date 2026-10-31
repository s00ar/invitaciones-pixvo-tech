# Prompt maestro para Codex
Actuá como desarrollador full-stack senior y diseñador de producto. Construí **Pixvo Invitaciones**, una plataforma web comercial de Pixvo.Tech para diseñar, cobrar, publicar y administrar invitaciones digitales mediante templates configurables.

## Contexto y orden de lectura
Leé README.md, AGENTS.md, docs/RESEARCH.md, docs/PRODUCT.md, docs/EDITOR.md, docs/ARCHITECTURE.md, docs/DATA-API.md, docs/ACCEPTANCE.md, docs/DEPLOYMENT.md, brand/tokens.json, templates/catalog.json y schemas/.
La referencia de negocio es https://somosweb.ar/invitaciones/ y el catálogo analizado es https://invita.somosweb.ar/templates.
La identidad observada corresponde a https://pixvo.tech/. No uses el cyan de Somos Web como identidad de Pixvo.

## Resultado esperado
Entregá una aplicación funcional con landing comercial, catálogo filtrable, preview, cuentas de usuario, dashboard, creación de invitaciones, editor visual, biblioteca de archivos, publicación con pago, URL pública, RSVP online persistente, exportación CSV y administración.
No te detengas en un mockup ni en un plan. Implementá, ejecutá y verificá los recorridos end-to-end. Cuando falten credenciales externas, completá todo lo que pueda probarse localmente y documentá el bloqueo específico.

## Diseño
Aplicá los tokens de brand/tokens.json y los logos originales incluidos. Fondo #03010E, violeta #937AFF, coral #FF5353, textos #DAD4DE, bordes #202128. Urbanist para títulos e Inter Tight para UI, con fuentes locales licenciadas o fallback explícito.
Construí una landing original de Pixvo con hero, CTA Crear invitación, categorías, galería, comparación de planes, proceso de tres pasos, funcionalidades, preguntas frecuentes y contacto configurable. Evitá testimonios, métricas o precios inventados.
La plataforma conserva Pixvo; cada invitación permite sus propios colores, tipos, imágenes y composición. No conviertas todos los templates en la misma página violeta.

## Implementación
Usá React, TypeScript y Next.js con App Router como propuesta base; Supabase para PostgreSQL, Auth y Storage; Mercado Pago Checkout Pro para Argentina. Si el repositorio ya contiene otra arquitectura funcional, justificá antes de sustituirla.
Verificá versiones compatibles en documentación oficial e incluí lockfile y runtime fijado.
Separá renderer público, editor y persistencia. Los tres deben usar el mismo documento versionado y motor de bloques.
Implementá los 27 presets del catálogo como configuraciones, con al menos cinco familias de composición realmente distintas: editorial, ornamental, fiesta/neón, infantil y corporativa. Los presets libres habilitan selección inicial completa de estilos. Todos permiten personalización dentro de sus capacidades y plan.
Comenzá por XV, bodas y flujo de creación completo, y luego completá las demás categorías; esto es orden de trabajo, no reducción de alcance.

## Editor
Permití editar nombre(s), tipo de evento, fecha, hora, zona horaria, lugar(es), mapas, texto, colores, tipografía, fondos, overlay, fotos, videos, audio, dress code, regalos, Instagram, hashtag y bloques opcionales.
Incluí activar/desactivar/reordenar bloques, duplicación cuando corresponda, deshacer/rehacer, autosave con estados visibles, recuperación de borrador, preview móvil/desktop y comparación antes de publicar. Cambiar template conserva datos compatibles y avisa lo que cambia. No pierdas fotos o RSVP al hacerlo.
El editor no debe permitir JavaScript ni HTML arbitrario. Preview y URL pública renderizan los mismos componentes.

## Flujo completo
Catálogo → preview → elegir template → autenticación conservando selección → borrador → editor → validación → checkout → pago verificado por servidor → publicar → compartir URL/QR → responder RSVP → consultar/exportar respuestas.
No marques pagos aprobados por parámetros de retorno del navegador. Verificá firma del webhook según documentación vigente, consultá al proveedor, validá importe/moneda/orden y procesá de forma idempotente.
Guardá borrador y versión publicada separados. Los cambios sin publicar no alteran la invitación activa. Aplicá permisos y derechos del plan en servidor.
RSVP online es un requisito explícito de Pixvo aunque en la landing de referencia se anuncie WhatsApp. WhatsApp será complemento, no sustituto del registro online.

## Medios
Usá los SVG propios incluidos como recursos de partida y los logos de Pixvo. research/media permite inspeccionar las referencias, pero no implica licencia de reutilización comercial. No lo importes en el bundle público. Para fotos, música, video y fuentes adicionales, incorporá archivos propios/licenciados y registrá origen/licencia. Permití subir archivos del cliente. El producto debe funcionar sin música o fotos.
Spotify debe presentarse como enlace/embed válido; no prometas reproducir pistas completas como audio ambiental. Audio directo solo con archivo autorizado y activación del visitante; video con poster y fallback.

## Criterios de entrega
Cumplí docs/ACCEPTANCE.md. Agregá migraciones reproducibles, seed de templates, .env.example, README de instalación, scripts de desarrollo/build/test, pruebas de aislamiento de propietarios, flujos de pago y RSVP, pruebas E2E y guía de despliegue/rollback.
No expongas service-role keys al cliente. Usá storage privado para borradores y proyección pública saneada al publicar.
Trabajá por hitos y continuá hasta completar el alcance o encontrar un bloqueo real. Documentá qué está implementado y probado, qué falta y cómo reproducir cada error con su log. No describas un mock como integración finalizada.
Al terminar, resumí cambios, comandos ejecutados y resultados, limitaciones, configuración pendiente y próximos pasos de lanzamiento.
