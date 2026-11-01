# Mercado Pago para Pixvo Invitaciones

## Crear la aplicación

En Mercado Pago Developers → Integraciones → Crear en el panel de integración:

| Campo | Valor |
|---|---|
| Solución | Checkout Pro |
| Tipo de API | **API de Orders** |
| Nombre | Pixvo-Invitaciones |
| Sitio web, si lo solicita | https://invitaciones.pixvo.tech |

Revisar y aceptar las condiciones con la cuenta que recibirá los cobros. El aviso del panel sobre la próxima discontinuación de Preferences justifica elegir Orders para esta integración nueva; no se inventa un plazo. No hace falta generar links de pago manuales: la aplicación creará el checkout para la invitación, el plan y el precio seleccionados.

## Configurar primero Prueba

Abrir la aplicación creada y seleccionar **Prueba** en el selector superior. En Credenciales, copiar el Access Token en el gestor de variables del servidor, sin compartirlo en capturas, chats o Git. En esta API, el Access Token de Prueba también puede empezar con `APP_USR`; verificar siempre el selector de entorno. No se necesita Public Key en el checkout por redirección implementado.

En Configuración de Webhooks, con Prueba seleccionado:

| Campo | Valor |
|---|---|
| URL | https://invitaciones.pixvo.tech/api/webhooks/mercadopago |
| Evento | **Order (Mercado Pago)** |

Guardar y copiar la firma secreta generada al gestor del servidor. Cuando se pruebe en otro dominio de staging, reemplazar el dominio de esta URL y NEXT_PUBLIC_APP_URL por el de staging.

Variables necesarias:

| Variable | Contenido |
|---|---|
| NEXT_PUBLIC_APP_URL | https://invitaciones.pixvo.tech (o dominio HTTPS de staging) |
| MERCADOPAGO_ENV | sandbox para Prueba; production solo después de validar y autorizar el lanzamiento |
| MERCADOPAGO_ACCESS_TOKEN | Access Token del entorno seleccionado |
| MERCADOPAGO_WEBHOOK_SECRET | Firma secreta de Webhooks de ese entorno |
| MERCADOPAGO_COLLECTOR_ID | ID del **usuario vendedor** de ese entorno, no el ID de la aplicación ni su Client ID |
| PAYMENTS_ENABLED | false hasta aplicar la migración y preparar las pruebas; true solo en staging durante la validación |

El ID del vendedor corresponde al campo `id` de `GET https://api.mercadolibre.com/users/me`, usando ese Access Token en el header Authorization. La documentación oficial de credenciales indica esta consulta. La aplicación la realiza para comprobar que el token pertenece al vendedor configurado y que su tag `test_user` coincide con sandbox. No utiliza el prefijo del token como prueba del entorno. Si esta consulta no está autorizada, la integración queda bloqueada sin crear el checkout; comprobar permisos con Mercado Pago antes de activar pagos.

Hostinger puede reemplazar todas las variables en una sola operación. Al editarlas, conservar las existentes de Supabase y base de datos; nunca copiar valores enmascarados como si fueran credenciales.

## Actualizar la base y verificar

Aplicar la migración aditiva `202611010004_mercadopago_orders.sql` con el runner, o ejecutar otra vez [supabase/bootstrap.sql](../supabase/bootstrap.sql) completo en Supabase → SQL Editor → New query. El bootstrap preserva datos y ajustes y devuelve **27 templates / 3 planes / 4 migraciones**. Se agregan un ID único de order del proveedor y el entorno de pago; el historial anterior permanece intacto.

En staging, usar comprador y tarjetas de prueba del panel. Comprobar aprobado, pendiente, rechazado, entrega repetida y devolución. El servidor debe verificar firma, consultar `/v1/orders/:id` y comprobar vendedor, entorno, asociación de orden, ARS e importe completo acreditado. Solo `processed/accredited` con importe correcto otorga derechos; el retorno del navegador no los modifica. Después, reabrir el editor y publicar explícitamente.

Las pruebas automatizadas usan un proveedor aislado y PostgreSQL local; no equivalen a una compra aprobada por Mercado Pago. Hasta completar credenciales, migración remota y compra de prueba, la integración externa sigue pendiente. El código no inicia cobros reales ni devoluciones por sí mismo.

## Diagnóstico de respuesta de checkout

Crear el checkout y verificar un pago tienen contratos separados. POST /v1/orders se valida por id y checkout_url; después se consulta GET /v1/orders/:id y se verifican tipo, modo manual, ID, external_reference, vendedor, moneda e importe antes de guardar el enlace. No se requieren fechas de actualización, total pagado ni transacciones al crear el checkout. La creación no concede derechos: el webhook conserva su validación completa del pago acreditado.

Ante respuesta incompatible, el mensaje indica los nombres de los campos afectados. Runtime logs muestra `pixvo.mercadopago.invalid_response` con etapa y códigos de validación. No incluye valores, cuerpo del proveedor, client_token, URL de checkout, token, IDs de cuenta ni texto de errores Zod. Compartir únicamente esa línea de diagnóstico si persiste. Los reintentos conservan el UUID idempotente de la orden; no crear órdenes alternativas para eludir la validación.

## Fuentes oficiales verificadas el 2026-11-01

- [Crear aplicación y credenciales de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/create-application?scope=prod)
- [Crear order y obtener checkout_url](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/create-order?scope=prod)
- [Consultar order](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro/get-order/get)
- [Notificaciones y firma](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/notifications?scope=prod)
- [Estados](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/payment-management/status/order-status?scope=prod)
- [Credenciales y consulta users/me](https://www.mercadopago.com.ar/developers/es/docs/automatic-payments-orders/resources/credentials?scope=prod)
- [Respuesta de usuario y tag test_user](https://developers.mercadolibre.com.ar/consulta-usuarios)
