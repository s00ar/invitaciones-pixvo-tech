# Arquitectura propuesta
React + TypeScript + Next.js App Router; PostgreSQL/Auth/Storage en Supabase; Mercado Pago Checkout Pro. Estas elecciones son propuestas, no tecnologías verificadas del competidor.

## Límites de módulos
- app marketing/catalog: SSR/SEO y previews públicas con fixtures.
- packages/invitation-domain: tipos, validadores, migraciones del documento, reglas de planes.
- packages/invitation-renderer: componentes de bloques sin dependencia del editor.
- editor: formularios, orden de bloques, historial y manejo de conflictos.
- server/services: auth, invitaciones, publicación, invitados, respuestas, medios y billing.
- integrations: adapters de pago, correo, calendario y storage; mocks solo en tests/dev, nunca éxito falso en producción.

## Persistencia
Borrador privado y snapshot publicado separados. La página pública lee solo proyección saneada de versión publicada; nunca serializa ownerId, emails de invitados, órdenes, tokens o respuestas.
RLS en todas las tablas expuestas y políticas storage por owner. La clave service-role solo del lado servidor, con chequeo explícito de autorización antes de cada operación privilegiada.
Los endpoints públicos de RSVP operan con slug activo/token firmado, validación, rate limiting y desafío antiabuso cuando corresponde. No abrir SELECT público sobre tablas privadas para facilitar formularios.

## Extensibilidad
Registry de bloques con schema, defaults, renderer, inspector y capacidad por plan. Registry de templates con versión, familia visual y defaults. Migraciones documentadas permiten cambios de schemaVersion; snapshots publicados mantienen renderer compatible o migración probada.
No hardcodear lógica por 27 páginas. Cinco familias de layout y presets visuales distintos son requisitos; un cambio de color sobre una única plantilla no basta.

## Rendimiento y accesibilidad
Imágenes responsivas con ancho/alto, lazy-load debajo del hero, poster de video, carga diferida de audio/embeds. Servir URL pública con caché invalidada al publicar/pausar, sin filtrar borradores. reduced-motion, contraste AA, etiquetas de formulario, focus visible, teclado y errores anunciados.

## Documentación oficial consultada
- https://nextjs.org/docs
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/overview
Revisar documentos específicos de SDK, firmas de webhooks y Auth antes de implementación. No fijar una versión por conocimiento desactualizado.
