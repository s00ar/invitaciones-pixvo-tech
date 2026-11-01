# Evidencias de QA

Capturas generadas con Chromium y datos ficticios en la base de tests aislada.

- landing-desktop.png: portada comercial Pixvo.
- catalogo.png: catálogo filtrado por XV.
- editor-desktop.png y editor-mobile.png: mismo documento en editor y vista de 390 px.
- publicacion.png: enlace público y QR del snapshot.
- invitacion-publica.png: confirmación persistida desde contexto de invitado separado.
- respuestas.png: panel privado de RSVP.
- muestras-xv.png: galería de las cinco muestras aportadas por el titular.
- muestra-sobre-premium-mobile.png: preview de muestra a 390 px.
- precios-desktop.png y precios-mobile.png: tres importes aprobados, descripciones, nota de adicionales y estado pendiente de Google Sheets.

El QR se decodifica automáticamente y coincide con la URL abierta desde otro contexto de navegador. No se comprobó todavía el escaneo con cámara física ni Safari/iOS. Las comprobaciones axe se ejecutan en landing, catálogo, login, preview y las cinco muestras personalizadas; no certifican por sí solas toda la accesibilidad de contenido personalizado por clientes.

Las rutas localhost de las capturas pertenecen al servidor de test efímero en puerto 3001. Los pagos usados en ese recorrido son fixtures; no son una transacción de Mercado Pago sandbox.

## Orders API (2026-11-01)

Contrato HTTP aislado: cuenta del vendedor, POST /v1/orders con UUID idempotente, reuse de checkout, montos string y retornos sin barra doble; respuesta client_token descartada. HMAC inválido no consulta al proveedor. Un webhook con datos de acreditación falsos sigue pendiente si el GET de la order no confirma el pago. Se prueba acreditación, importe parcial rechazado, moneda/vendedor/entorno/ID ajenos, concurrencia, duplicados, estados viejos, devolución parcial/total y contracargo preservando RSVP. Los tests E2E usan fixtures; queda pendiente la compra en el sandbox externo.

El SQL se prueba contra PostgreSQL local: nueva instalación, repetición sin sobrescrituras y upgrade desde tres migraciones conservando órdenes heredadas. El primer test nuevo falló con `AssertionError: expected -1 to be greater than 0` al buscar `do $pixvo_migration_3$`; el bloque del generador se llama `do $pixvo_apply_3$`. Tras corregir el selector, `vitest run tests/bootstrap.test.ts` pasa 3/3. La migración no necesitó cambios para resolverlo.

CI Linux aprobado para d0b6fc7: https://github.com/s00ar/invitaciones-pixvo-tech/actions/runs/41283811708. npm ci, npm audit (0 vulnerabilidades), lint, typecheck, 46/46 pruebas, build, trazado de CA y 8/8 E2E pasan. Evidencia completa de CI descargada localmente en .data/ci-orders.log (ignorada por Git); no contiene credenciales reales ni demuestra una compra externa. La base remota requiere aplicar la migración 004 antes de habilitar pagos.

## Respuesta de checkout incompatible — 2026-11-01

El titular reporta Respuesta de checkout incompatible después de configurar Producción. Ese punto del código solo se alcanza tras verificar la cuenta del token y recibir HTTP exitoso de POST /v1/orders; no prueba una transacción pagada. El campo exacto de la respuesta real que se rechazó no estaba registrado y no se afirma conocerlo. Se detectó que la creación reutilizaba el schema completo de liquidación, exigiendo total_paid_amount, status_detail, last_updated_date y estructura de transacciones que no son necesarios para obtener un enlace.

Se separan contratos: POST valida id/checkout_url, luego GET verifica identidad comercial y asociación a la orden local antes de persistir. El webhook conserva validación completa y exclusividad para otorgar derechos. Se reproducen respuestas iniciales mínimas/metadatos nulos con proveedor aislado. Se rechazan ID, referencia externa, vendedor, moneda e importe ajenos por GET; no se guarda enlace ni se otorgan derechos y se conserva la misma clave idempotente para reintentar. No se añadieron fallbacks a Preferences, aprobaciones manuales ni pagos por retorno del navegador.

El diagnóstico de respuestas inválidas muestra solo campos permitidos, etapa y código; pruebas verifican que no aparezcan cuerpos, URLs, client_token, valores privados ni campos arbitrarios. Local: npm test 50/50, npm run lint y npm run typecheck pasan. No hay cambios de dependencias, SQL, variables del hosting ni cobros. Pendiente confirmar CI, despliegue y reintento real con la cuenta del titular; un stub no certifica que el rechazo externo ya esté resuelto.

CI Linux aprobado para 462a23d: https://github.com/s00ar/invitaciones-pixvo-tech/actions/runs/41288865968. npm ci, npm audit (0 vulnerabilidades), lint, typecheck, 50/50 pruebas, build, CA incluida y 8/8 E2E pasan. Contratos del proveedor probados con stub; no hay confirmación todavía del reintento real. El webhook remoto sin firma ya responde 401 en lugar de 503 de configuración; esto no prueba una notificación auténtica ni un pago. No requiere una nueva migración ni cambiar claves.

## Regresión de video — 2026-11-01

Reproducir con `npm run test:e2e -- tests/e2e/video.spec.ts`: utiliza dos videos originales generados mediante canvas/MediaRecorder, base local aislada y almacenamiento privado de la aplicación. No copia material externo ni usa videos del cliente. El test comprueba tiempo de reproducción, color de un fotograma decodificado para distinguir los archivos, pausa, cambio sin reload, controles accesibles, preview y publicación anónima; además, falla de red, recuperación y privacidad de los recursos no publicados.

Antes de la corrección, al seleccionar el segundo video `currentSrc` conserva el primero y la expectativa vence después de 15 segundos. Los primeros intentos del test también detectaron dos errores del fixture, ya corregidos: la subida devuelve 201, no 200; se localiza el selector por su rol/etiqueta accesible en vez del texto completo del label, que incluye opciones. Esos errores no eran fallos de subida del producto. La ejecución dirigida posterior al arreglo pasó 1/1; captura en `test-results/evidence/video-publico.png` (ignorada por Git, incluida en artefactos CI). La suite completa y build se registran después con su ejecución final.

No se afirma compatibilidad del MP4 privado del titular, ni integración alojada de Storage, ni verificación en dispositivos físicos a partir del test de Chromium local. Los archivos reales siguen sujetos al soporte de codec del navegador; el renderer muestra un error y alternativa cuando falla.

Verificación final del cambio a70606e: `npm run lint`, `npm run typecheck` y `npm test` pasan localmente (50/50). ESLint también pasó sobre los tres archivos TypeScript modificados tras el ajuste final del estado de error. `npm run test:e2e` pasó 9/9 (2,9 min), incluyendo reproducción con Quince Disco, el diseño del caso reportado. La primera prueba dirigida también pasó con la familia ornamental.

CI Linux aprobado: https://github.com/s00ar/invitaciones-pixvo-tech/actions/runs/41316873299. Instalación limpia, auditoría, lint, tipos, 50 pruebas, compilación, verificación del certificado y nueve recorridos E2E pasan. Esto verifica el código y la reproducción con videos de prueba; el MP4 privado del titular y los dispositivos físicos siguen pendientes de reintento. El cambio no requiere SQL ni nuevas variables. El titular ya confirmó anteriormente que abre el checkout de Producción con el precio aprobado; esta corrección no modifica los pagos ni afirma que exista un pago acreditado.

## Límites de archivos y favicon — 2026-11-01

Pruebas nuevas en media-policy.test.ts comprueban los seis formatos en su límite exacto y un byte por encima, extensión con MIME ausente, archivos vacíos y formatos no admitidos. Las pruebas de plataforma comprueban rechazo de MP4 de más de 10 MB aunque se declare como MP3, aceptación en el borde exacto y rechazo global antes de leer el cuerpo del archivo. Un MP4 mínimo de fixture sirve para inspeccionar firma y límites, no para afirmar reproducción.

Reproducir en navegador: npm run test:e2e -- tests/e2e/media.spec.ts tests/e2e/video.spec.ts. Se comprueban la guía en ambos lugares, el bloqueo local sin petición de subida, el rechazo HTTP413 al saltar el navegador y ausencia de filas nuevas. El favicon debe figurar en head, devolver PNG de 96 × 96 y un ICO válido; sus bytes provienen del recurso original del titular. Captura de guía: test-results/evidence/guia-video-limites.png, ignorada por Git y publicada solo como evidencia ficticia del CI.

Continúa pendiente obtener el archivo original o el estado de reproducción para diagnosticar el reporte del titular; estos tests no certifican el codec de ese archivo ni dispositivos físicos. No se modificó el video privado ni se hicieron compras/pagos para verificar archivos.

Verificación local: lint y typecheck pasan, 60/60 pruebas pasan. Favicon PNG/ICO y guía/límites en navegador pasan 2/2; el recorrido de reproducción con WebM/VP8 pasó también con la nueva política. El primer intento de E2E agotó los 120 s de arranque; el log de Next registró Slow filesystem detected (1.520 ms), compilación del proxy a los 59 s y portada a los 81 s. Al repetir con caché preparada inició normalmente. El primer test de aviso tenía un selector ambiguo entre el alert del editor y el anunciador de rutas de Next; se acotó a .inspector y pasó. Evidencia reproducible con los comandos de este apartado; estos dos fallos no se declaran errores de subida de producción. La verificación de la suite completa y build se delega al CI de la rama antes de desplegar.
