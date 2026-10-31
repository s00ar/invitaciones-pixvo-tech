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

## Arquitectura implementada (2026-10-31)

- Next.js 16.4.3 App Router y React 19.3.1; proxy SSR para refrescar cookies Supabase. La autorización sensible siempre se repite en servidor, fuera del proxy.
- Supabase Auth/Storage para producción; PostgreSQL mediante pg y transacciones que asumen service_role. Las mutaciones de la app validan explícitamente propietario/rol; el Data API no concede INSERT/UPDATE/DELETE al navegador. RLS limita lecturas directas por propietario/admin.
- Desarrollo explícito con PGlite persistente, tablas de sesión locales privadas y hashes scrypt. No se habilita en producción. Mismas migraciones de producto y pruebas RLS con roles reales de PostgreSQL; Storage alojado y Auth externo requieren staging.
- Documento v1 y motor compartido en src/domain y components/invitation.tsx. Cinco ramas de composición de portada y estilos de bloques; presets generados saneados sin metadata del competidor en cliente. Sync-presets copia únicamente brand y fondos propios.
- Server/services contiene autorización, revisiones, snapshots, rollback, invitados, respuestas y administración. Media procesa imágenes en servidor y almacena archivos privados. Payments implementa contrato de preferencias y verificación server-to-server.
- Proyección pública con allowlist por bloque; medios públicos solo por referencia de un snapshot activo. Sin SELECT anónimo sobre invitaciones/RSVP/medios/órdenes; las rutas públicas son proyecciones controladas con no-store.
- La revisión del borrador es optimista (409), la publicación y cupos se serializan por fila. Autosave tiene recuperación local y cola de cambios pendientes, sin bucles de reintento de un servidor fallido.
- No hay HTML/CSS/JS arbitrario, hotlinks al competidor ni paquete de research en el build. No hay proveedor falso ni bypass de pagos en las rutas de producción.
