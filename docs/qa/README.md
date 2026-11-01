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
