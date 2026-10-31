# Estado de implementación — 2026-10-31

## Hitos

| Hito | Implementación | Evidencia disponible |
|---|---|---|
| Base, identidad y catálogo | Next.js/React/TypeScript; tokens Pixvo, logos propios, landing, planes sin precios inventados, filtros por URL y 27 previews | Catálogo visible y responsive probado en Chromium |
| Editor y persistencia | Documento versionado; cinco composiciones; formularios de evento/estilo/bloques, medios privados, historial 50 pasos, autosave con revisión, recuperación, comparación | Tests de conflictos, persistencia y recuperación de red; capturas desktop/móvil |
| Publicación y RSVP | Snapshots inmutables, derechos por plan, enlaces abiertos/personales, cupos, sí/no, actualización por token, CSV, QR e ICS | Servicios PostgreSQL y recorridos de navegador; QR decodificado |
| Pagos | Preferences API y webhook firmado; consulta al proveedor, validación de orden/collector/importe/moneda/modo, idempotencia | Contratos probados con proveedor stub; sandbox externo pendiente |
| Administración | Planes/precios/beneficios, disponibilidad de templates, pausa de eventos, pagos verificados, encargos y auditoría | Acceso por rol y cambios auditados probados |
| Operación y QA | Migraciones, seed, env example, lockfile, runtime, guía de staging/rollback y CI | Verificado localmente; CI preparado |

## Límites confirmados

- No hay credenciales de Supabase ni Mercado Pago aportadas al entorno. La app muestra configuración pendiente, sin fingir correo, checkout o aprobación.
- Se usa PGlite/PostgreSQL persistente en desarrollo. RLS se prueba con roles separados y dos usuarios de fixture. Falta repetirlo con dos usuarios reales de Supabase alojado y con Storage real.
- Las pruebas de publicación usan órdenes ficticias preparadas solo en la base aislada de tests. No son pagos de sandbox del proveedor y no hay endpoint de bypass en la aplicación.
- El hito inicial se verificó localmente. La actualización a Hostinger fue autorizada después por el titular; ver registro al final. No se ejecutaron cobros reales ni se afirma paridad con paneles privados del competidor.
- Fuentes locales con fallbacks explícitos; sin archivos de fuentes ni fotos/música ajenas redistribuidas. research/media no se importa en la app.
- Video/audio se inspeccionan por firma/tamaño; no se transcodifican ni analizan con antivirus. Imágenes sí se decodifican, optimizan y se eliminan metadatos.
- Limpieza irreversible de medios y retención requieren política del titular. Las referencias de snapshots se conservan.
- Privacidad/condiciones, contacto, precios y permanencia comercial definitivos pendientes antes de habilitar ventas.
- El remoto de aplicación es público. Durante la tarea se publicó main en 8c07bd7 con el historial previo del kit. La rama codex/pixvo-platform retira research/media del árbol distribuido y conserva las copias locales ignoradas. No reescribe el historial ya publicado.

## Verificación

- 23 pruebas de dominio/servicios pasaron, incluyendo crear/editar/publicar los 27 presets, RLS, acceso ajeno, medios, firma, checkout/webhook con stub, duplicados concurrentes, snapshot, rollback, RSVP/cupos, CSV e ICS.
- Los siete recorridos E2E pasaron tras npm ci: responsive, selección a través del registro, editor/undo/template/publicación/QR/RSVP/CSV, accesibilidad/teclado, propietarios, red/recuperación/conflicto y administración.
- Build de producción: PASS, sin advertencias de trazado. Lint: PASS sin advertencias. Typecheck: PASS con next typegen. npm ci: PASS sobre Node 24.22.2. Bundle cliente sin referencias a Somos Web, research/media ni variable service-role.
- npm audit --omit=dev: 0 vulnerabilidades. npm audit completo: 16 moderadas de la cadena de herramientas ESLint/minimatch; no se aplicó un downgrade mayor automático. Reevaluar antes de integrar CI.

Comandos ejecutados: npm ci; npm run lint; npm run typecheck; npm test (23/23); npm run build; npm run test:e2e (7/7); npm audit --omit=dev; python scripts/validate.py. Evidencias: docs/qa/verification.txt y siete capturas en docs/qa/. CI en GitHub se define en .github/workflows/checks.yml; su ejecución remota se consulta en el PR. Ver README.md y DEPLOYMENT.md para reproducir instalación, staging y rollback.

## Actualización autorizada a Hostinger — 2026-10-31

El titular informó que Hostinger despliega automáticamente `main` a https://invitaciones.pixvo.tech y solicitó expresamente el push de actualización. Se integra la aplicación completa de la rama anterior y se agregan cinco muestras XV en /personalizadas, con creación editable y solicitudes a medida que conservan la selección.

La integración usa el documento v1 con `theme.sampleStyle` opcional y enum seguro: compatible con documentos y snapshots anteriores. No requiere nuevas tablas ni migraciones de base de datos. La muestra elegida se valida en servidor al crear; el cambio de estilo conserva datos, bloques y medios. El catálogo original mantiene sus 27 presets.

Pruebas: lint, typecheck y build pasan; 26 tests de servicios pasan (incluyen crear, publicar y responder RSVP para las cinco muestras). El nuevo E2E local pasó: cinco estilos en 360/390/768/1440 px, axe WCAG A/AA, selección a través del login, autosave/reapertura/cambio de estilo, encargo persistente y rechazo de estilos inválidos. Se revisaron visualmente las cinco capturas móviles y la galería. Evidencias: docs/qa/muestras-xv.png y docs/qa/muestra-sobre-premium-mobile.png. Origen y adaptación del ZIP: assets/custom-samples/SOURCE.md.

El primer CI de muestras (41219421644) pasó los siete recorridos previos y falló por opacidad heredada que reducía el contraste del rótulo RSVP de Romántica. Se corrigió en 5b8c55e y la prueba local ya pasa. Reproducir: `npm run test:e2e -- --grep "cinco muestras XV"`; diagnóstico inicial: regla axe `color-contrast`, selector `#confirmacion > .inv-eyebrow`. El primer intento local de la suite no pudo arrancar porque un servidor de desarrollo del mismo checkout mantenía `.next/dev/lock`; detener ese servidor antes de ejecutar Playwright resolvió el arranque.

CI Linux final aprobado para el código 5b8c55e: https://github.com/s00ar/invitaciones-pixvo-tech/actions/runs/41219758420. Instalación limpia, lint, typecheck, 26/26 tests, build y 8/8 E2E pasan. La prueba nueva local pasó en 51,1 s; suite completa en CI en 1,1 min. El servidor local habitual se restauró en http://localhost:3000 después de las pruebas.

Push autorizado completado: main avanzó sin force-push de 8c07bd7 a 47255eb26d326050b0c1bee5d265aae52d91a4d8. Se confirmó el SHA remoto mediante la API de GitHub. Incluye la plataforma completa y las cinco muestras. Los commits posteriores a ese SHA solo actualizan evidencias y estado del despliegue.

Hostinger no dispone de herramientas MCP conectadas en esta sesión. Se reutilizó el auto-despliegue indicado por el titular, sin cambiar hosting, DNS, variables ni credenciales. El dominio devolvía 403 antes de la actualización y, tras el push y una segunda comprobación en navegador, sigue devolviendo `403 Forbidden / Access to this resource on the server is denied!`; `/personalizadas` devuelve 404. Ambas respuestas vienen de `hcdn` y no muestran la aplicación. No se afirma despliegue finalizado ni se atribuye el error a una causa no inspeccionada.

Reproducción HTTP: `curl.exe -I https://invitaciones.pixvo.tech/` y `curl.exe -I https://invitaciones.pixvo.tech/personalizadas`; también se verificaron solicitudes GET y el navegador. Bloqueo externo concreto: no hay acceso al estado ni al log del despliegue de Hostinger; GitHub no expone deployments del proveedor. En hPanel, revisar el despliegue asociado a main y su log, confirmar que la aplicación esté configurada para Node.js/Next.js con `npm ci`, `npm run build` y `npm start`, y verificar las variables/migraciones indicadas en DEPLOYMENT.md. El 403 por sí solo no permite determinar si el proceso de construcción falló, no comenzó o si el dominio está sirviendo otro directorio.
