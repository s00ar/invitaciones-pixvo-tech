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
- Privacidad/condiciones, contacto, adicionales y permanencia comercial definitivos pendientes antes de habilitar ventas. Los tres precios base fueron aprobados después por el titular; ver actualización de precios al final.
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

## Precios comerciales aprobados — 2026-10-31

Básica $35.000 ARS, Interactiva $60.000 ARS y Premium $100.000 ARS, con descripciones aportadas por el titular y nota de adicionales según funcionalidades extra. La landing y /precios comparten el mismo componente; el editor/checkout lee esos planes desde PostgreSQL. Se mantienen IDs internos y snapshots previos; migración 202610310003 para instalaciones existentes y seed con los importes aprobados para bases nuevas. Básica habilita audio autorizado conforme a la descripción. El catálogo identifica los niveles con los nuevos nombres.

Google Sheets se muestra como integración pendiente: no hay conector implementado ni se finge sincronización. El registro RSVP persistente y CSV permanecen disponibles. WhatsApp sigue siendo un complemento configurable. Diseño personalizado/exclusivo corresponde al servicio de Pixvo; no se afirma generación automática de diseños a medida. No se habilitan pagos ni se ejecutan cobros al configurar estos valores.

Verificación local: lint y typecheck pasan; 27/27 tests de servicios pasan, incluyendo actualización de precios heredados, ejecución única de la migración, conservación de ajustes administrativos posteriores y snapshots de órdenes sin cambios. El recorrido E2E de landing/catálogo/precios pasó en 32,4 s: importes y nombres en / y /precios, sin desborde en 360/390/768/1440 px y axe WCAG A/AA en precios. Capturas desktop y móvil revisadas en docs/qa/precios-*.png. El servidor habitual se restauró en localhost:3000 y la página de precios se verificó contra la base persistente local.

CI Linux aprobado para 2d5570d: https://github.com/s00ar/invitaciones-pixvo-tech/actions/runs/41220596116. `npm ci`, lint, typecheck, 27/27 tests, build y 8/8 E2E pasan. No hay DATABASE_URL ni configuración de Supabase en el entorno local; la migración de precios no se ejecutó contra producción. Para aplicar los importes al checkout de una base existente usar el runner documentado en README/DEPLOYMENT con credenciales del entorno correspondiente. Publicar código no habilita Mercado Pago ni integra Google Sheets.

## Inicialización de Supabase y error de renderizado — 2026-10-31

Después de que el titular configurara una Web App y sus variables, el dominio pasó a devolver un error de la aplicación: portada y `/api/plans` responden HTTP 500. La consola muestra React 441, que corresponde a un fallo de renderizado de Server Components con detalles ocultos en producción. Se verificó con una lectura pública de la API de Supabase que `public.plans` devuelve 404/PGRST205 (tabla no encontrada en schema cache). Esto confirma que el esquema no está disponible para la aplicación; falta comprobar con los logs privados si hay además un problema de conexión PostgreSQL. No se accedió a secretos ni se ejecutó SQL remoto.

Se agrega `supabase/bootstrap.sql`, generado desde las migraciones existentes y el catálogo saneado, para que el titular pueda inicializar desde SQL Editor sin compartir credenciales. Incluye las tres migraciones, políticas por propietario, bucket privado, 27 templates y los tres precios aprobados; conserva ajustes y datos en repeticiones y aborta ante un esquema previo sin historial. El botón Reintentar usa `retry()` conforme a la guía local de Next 16.4 para volver a solicitar los datos del servidor.

Verificación local: lint y typecheck pasan; 29/29 tests pasan. Dos pruebas nuevas ejecutan el SQL completo sobre PostgreSQL/PGlite con schemas auth/storage simulados, verifican seed, bucket privado, permisos, repetición y rollback ante una base ajena. También se comprobó la generación reproducible con saltos de línea Windows/Linux. Esto no sustituye la ejecución en Supabase alojado: aún debe realizarla el titular o un entorno autorizado con conexión privada. Se entregó el artefacto probado para SQL Editor y se solicitó el resultado y el log de servidor para comprobar después las rutas reales.

CI Linux final aprobado para 8d33a1b: https://github.com/s00ar/invitaciones-pixvo-tech/actions/runs/41236146426. Instalación limpia, lint, typecheck, 29/29 tests, build y 8/8 E2E pasan. El CI inicial de esta actualización también pasó (68ba494, run 41236003935). No hay credenciales privadas locales ni herramientas de Hostinger/Supabase operativas para ejecutar la migración remotamente; producción queda pendiente de la ejecución del SQL y nueva verificación HTTP, no se marca resuelta con el CI.

## CA PostgreSQL en Hostinger — 2026-10-31

El log aportado por el titular confirma `self-signed certificate in certificate chain` en pg-pool al cargar datos; el aviso sobre `sslmode=require` es una deprecación distinta de ese fallo. El titular aportó el certificado CA público descargado de Supabase: Root 2021 CA, válido hasta abril de 2031. Su procedencia y fingerprint están en certs/README.md. Se integra automáticamente solo en los hosts PostgreSQL de Supabase, con validación de cadena y hostname. La opción `DATABASE_SSL_CA` permite una sustitución autorizada en una rotación. Runtime, migraciones y seed comparten configuración; Next incluye el certificado en el artefacto del servidor y el CI comprueba el trazado.

Se comprobó un handshake real contra el pooler de la región del proyecto: `authorized=true`, con CA/hostname verificados, sin enviar usuario, contraseña ni SQL. Es una prueba de transporte, no de autenticación a la base. Cinco tests nuevos cubren selección restringida de CA, parser de pg, valores inválidos, negociación SSLRequest, rechazo de CA desconocida y hostname incorrecto. El primer test TLS genérico fue interceptado por el software de inspección TLS local; se verificó la diferencia de certificado y se ajustó el test al protocolo SSLRequest real que utiliza PostgreSQL. No se deshabilitó el antivirus ni la verificación TLS.

CI Linux aprobado para cdc6142: https://github.com/s00ar/invitaciones-pixvo-tech/actions/runs/41238714543. Instalación limpia, lint, tipos, 34/34 tests, build, comprobación del certificado en el trazado de producción y 8/8 E2E pasan. Local: 34/34 tests, lint y tipos pasan; los cinco tests TLS se repitieron tras la corrección final. El primer CI (41238567366) detectó TS2339 en el fixture de red al asumir Buffer en vez de string | Buffer; se agregó una comprobación explícita antes de equals, sin cambiar el comportamiento productivo. El build local previo encontró el mismo error antes de la corrección; el build final comprobado es el de Linux. La inicialización SQL y verificación de aplicación remota siguen pendientes; no se afirma acceso autenticado a PostgreSQL ni solución de producción basándose solo en CI o TLS.

## Sitio operativo y acceso Google — 2026-10-31

El titular confirmó la ejecución del bootstrap con 27/3/3 y corrigió la contraseña de DATABASE_URL en Hostinger. Comprobación HTTP posterior: portada, login y `/api/plans` devuelven 200, con los tres planes aprobados. La configuración pública de Supabase Auth devuelve `external.google=false`: el proveedor está desactivado y falta configurar su cliente OAuth. No se usaron claves privadas ni se inició sesión con una cuenta real durante el diagnóstico.

Una prueba de inicio de OAuth sin completar el login confirmó HTTP200, proveedor Google, PKCE S256 y cookie del verificador; también detectó `//auth/confirm` porque la variable canónica tiene barra final. Se comparte un constructor URL entre Google, confirmación por correo y recuperación para admitir ambas formas y preservar `next`. Se refuerza la validación de destinos locales frente a normalización de controles por URL. La guía GOOGLE-AUTH.md describe los callbacks distintos de Google/Supabase/Pixvo y la activación pendiente; las credenciales OAuth se configuran solo en Supabase.

Verificación local: lint y tipos pasan; 37/37 tests pasan. Tres tests nuevos cubren barra final, selección de invitación/recuperación, destinos externos y generación de URL/cookie PKCE con el SDK real sin credenciales ni login externo. Las pruebas específicas se repitieron tras reforzar la validación de destinos. CI Linux aprobado para 34dacb5: https://github.com/s00ar/invitaciones-pixvo-tech/actions/runs/41246379374. Instalación limpia, lint, tipos, 37/37 tests, build, trazado del certificado y 8/8 E2E pasan. El acceso completo con Google requiere activar/configurar el proveedor y probar con una cuenta autorizada; no se declara finalizado con un stub ni con la URL de inicio.
