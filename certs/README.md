# CA pública de PostgreSQL Supabase

`supabase-root-2021.crt` fue aportado por el titular desde la descarga de certificado de Supabase Database Settings el 2026-10-31. Contiene únicamente el certificado CA público, sin clave privada ni contraseña.

- Subject/Issuer: Supabase Inc, Supabase Root 2021 CA.
- Vigencia: 2021-04-28 a 2031-04-26.
- Fingerprint SHA-256 (DER): `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.

Se usa por defecto únicamente para hosts de conexión PostgreSQL `*.pooler.supabase.com` y `db.<ref>.supabase.co`; se verifica cadena y hostname. La variable de servidor opcional `DATABASE_SSL_CA` permite configurar otra CA autorizada si Supabase rota certificados. El resto de conexiones conserva la confianza del driver. El certificado se incluye explícitamente en el trazado del servidor Next.js; no está en `public/` ni se importa en componentes cliente.

Fuente operativa: https://supabase.com/docs/guides/platform/ssl-enforcement
