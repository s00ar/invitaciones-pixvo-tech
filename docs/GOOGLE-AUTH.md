# Acceso con Google en Supabase

El botón de Pixvo usa Supabase Auth con PKCE y cookies de servidor. El proveedor Google se configura en Supabase; sus credenciales OAuth no se guardan en el repositorio ni en variables `NEXT_PUBLIC_*` de Hostinger.

## Google Auth Platform

1. Abrir el proyecto correspondiente en https://console.cloud.google.com/auth/overview. Completar Branding con el nombre Pixvo Invitaciones y los datos reales de contacto del titular.
2. En Audience, seleccionar el público adecuado. Para una aplicación comercial dirigida a clientes, usar External. Si permanece en Testing, agregar las cuentas de prueba antes de verificar acceso; publicar para admitir el público previsto cuando la configuración esté lista.
3. En Clients, crear un OAuth Client ID de tipo **Web application**. Origen JavaScript autorizado: `https://invitaciones.pixvo.tech`.
4. En Authorized redirect URIs, pegar **la URL callback que muestra Supabase en su proveedor Google**, con formato `https://<PROJECT_REF>.supabase.co/auth/v1/callback`. Este callback pertenece a Supabase; la vuelta a Pixvo se configura por separado.
5. Guardar el Client ID y Client Secret en el gestor privado del titular. Para este login se usan los datos básicos de identidad, no permisos de Drive ni Sheets.

## Supabase

1. Authentication → Sign In / Providers → Google: activar Google, ingresar Client ID y Client Secret del cliente web y guardar. Mantener activada la validación de nonce.
2. Authentication → URL Configuration: Site URL `https://invitaciones.pixvo.tech`; agregar `https://invitaciones.pixvo.tech/auth/confirm` a Redirect URLs. Conservar los destinos necesarios de los otros entornos autorizados.
3. Hostinger mantiene `NEXT_PUBLIC_APP_URL=https://invitaciones.pixvo.tech`. La aplicación construye `/auth/confirm` mediante URL y conserva el destino de creación en `next`; también funciona si la variable tiene barra final.

## Verificación

- Sin completar un login, consultar la configuración pública `/auth/v1/settings` con la clave pública y comprobar `external.google=true`. Eso solo confirma activación, no que el secreto sea correcto.
- Desde `/login`, pulsar Continuar con Google, elegir una cuenta autorizada y verificar el regreso a `/app`. Probar después desde la selección de un template para confirmar que se conserva.
- `provider is not enabled`: comprobar activación en Supabase. `redirect_uri_mismatch`: comparar el callback **de Supabase** con el cliente web en Google. `access_denied` en Testing: comprobar Audience y cuentas autorizadas. Un retorno a localhost indica revisar Site URL y Redirect URLs.
- Un test de PKCE local verifica URL, preservación de `next` y cookie del verificador con el SDK real; no valida las credenciales ni sustituye el inicio de sesión completo con Google alojado.

Fuentes oficiales: [Google en Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [OAuth web de Google](https://developers.google.com/identity/protocols/oauth2/web-server).
