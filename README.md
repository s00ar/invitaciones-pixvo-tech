# Pixvo Invitaciones

Plataforma en Next.js App Router, React y TypeScript con 27 presets, editor por bloques, cuentas, panel del organizador, archivos, publicación versionada, RSVP online, CSV, QR, calendario y administración.

**Estado:** aplicación implementada, con auto-despliegue de `main` a https://invitaciones.pixvo.tech configurado por el titular. Las integraciones de Supabase y Mercado Pago requieren configuración y verificación externa. No se realizaron cobros durante la implementación. Ver [estado y evidencias](docs/IMPLEMENTATION-STATUS.md).

## Arranque local

Runtime fijado: **Node 24.22.2 LTS**, npm 11.6.0. Instalar la versión de `.node-version`/`.nvmrc` con el gestor habitual.

```sh
npm ci
npm run dev:local
```

Abrir http://localhost:3000 y registrar una cuenta. El modo local crea PostgreSQL con PGlite en `.data/postgres` y archivos privados en `.data/media`. Persiste entre reinicios y aplica las mismas migraciones de producto. No hay cuentas universales ni bypass de pagos en la aplicación. Correo, Google y Mercado Pago indican configuración pendiente.

El modo local se desactiva con `NODE_ENV=production`. **No sustituye una prueba contra Supabase alojado.** Los derechos ficticios de los tests se preparan en una base aislada; nunca desde un endpoint de la app. No ejecutar dos servidores sobre la misma carpeta PGlite.

Si la red necesita la CA del sistema, usar `NODE_USE_SYSTEM_CA=1`. No desactivar TLS.

Las conexiones PostgreSQL a hosts de Supabase usan automáticamente su CA pública incluida en `certs/`, con validación de cadena y hostname. No hace falta agregar variables para el certificado habitual. `DATABASE_SSL_CA` es una opción de servidor para sustituir la CA si Supabase rota certificados: admite PEM completo o una sola línea con `\n` entre líneas. Runtime, migraciones y seed comparten la configuración. Para otros hosts se conserva la confianza del driver. Usar `sslmode=verify-full` hace explícita la intención de verificación; el driver no debe configurarse para aceptar certificados desconocidos.

Seguridad de dependencias: `npm ci` aplica una adaptación versionada para que las herramientas de lint usen minimatch 11.0.1. `npm audit` se ejecuta en CI y debe pasar también incluyendo desarrollo. Ver [mantenimiento y compatibilidad](docs/SECURITY-MAINTENANCE.md); no ignorar scripts de instalación sin aplicar después esa adaptación.

## Supabase

1. Copiar `.env.example` a `.env.local` y completar URL/anon key, `DATABASE_URL` y service-role solo en servidor. Usar un proyecto separado de staging y TLS.
2. Aplicar migraciones con conexión autorizada para crear tablas y políticas:

```sh
node --env-file=.env.local --import tsx scripts/migrate.ts
```

3. Configurar Supabase Auth: URL canónica, redirects `/auth/confirm`, SMTP y Google OAuth opcional ([guía de Google](docs/GOOGLE-AUTH.md)). Confirmación y recuperación pasan por `/auth/confirm`, conservando el destino elegido y admitiendo URL canónica con o sin barra final. Adaptar la plantilla de recuperación para conservar el redirect a nueva contraseña.

4. La migración crea el bucket privado `pixvo-private`. Subidas solo mediante servidor, con inspección de bytes y procesamiento de imágenes.
5. Crear una cuenta y asignar admin con SQL controlado por el titular: `update public.profiles set role='admin' where id='<UUID>';`. El usuario no puede modificar su rol. Entrar a `/admin` para configurar planes, precios y disponibilidad.
6. Seguir [despliegue y rollback](docs/DEPLOYMENT.md), incluyendo sandbox y políticas comerciales.

No hay migraciones automáticas al iniciar producción. `DATABASE_URL` debe permitir `SET LOCAL ROLE service_role`. El Data API del navegador es de solo lectura y aplica RLS; las mutaciones validadas pasan por Next.js.

Si configurás Supabase desde su panel y no tenés una terminal con las credenciales, abrí **SQL Editor → New query**, pegá completo [supabase/bootstrap.sql](supabase/bootstrap.sql) y ejecutalo. Es la alternativa al runner anterior: genera tablas, políticas, bucket privado, 27 templates y tres planes, registrando las mismas migraciones. Al terminar devuelve `templates=27`, `plans=3`, `migrations=3`. Se puede repetir sin sobrescribir precios, configuraciones o registros existentes. Si detecta tablas previas sin historial de Pixvo, aborta toda la transacción para que se revise el esquema. No reemplaza la configuración de Auth ni de las variables del hosting. El archivo se regenera con `npm run db:bootstrap-sql`; no contiene claves ni contraseñas.

Precios base aprobados: **Básica $35.000 ARS · Interactiva $60.000 ARS · Premium $100.000 ARS**. Se pueden agregar adicionales según funcionalidades extra. Para una base existente, ejecutar el runner de migraciones para aplicar `202610310003_commercial_prices.sql`; conserva los importes y beneficios de órdenes anteriores. No habilita cobros ni configura proveedores. La conexión a Google Sheets figura como integración pendiente; el RSVP guarda respuestas en Pixvo y permite exportar CSV.

## Comandos

```sh
npm run dev            # Supabase configurado
npm run dev:local      # Desarrollo local explícito
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e       # Servidor aislado en 3001
npm run build
npm run verify:certificate # CA incluida en el artefacto de producción
npm start             # Producción, requiere Supabase
npm run db:seed        # DATABASE_URL en entorno
```

Next carga `.env.local`; los scripts TypeScript directos requieren `--env-file` o variables del entorno. Los resultados reales y limitaciones se registran en `docs/IMPLEMENTATION-STATUS.md`.

Los tests TLS necesitan OpenSSL (incluido en Git for Windows y disponible en el CI Linux). Generan certificados efímeros en una carpeta ignorada, usan la negociación SSLRequest de PostgreSQL y eliminan las claves de prueba al terminar; no se distribuyen claves privadas en el repositorio.

## Organización

- `src/domain/`: documento versionado, validación, planes, proyección pública, CSV e ICS.
- `src/components/invitation.tsx`: renderer único para preview, editor y público; cinco composiciones distintas y cinco muestras XV aportadas por el titular en `/personalizadas`.
- `src/components/editor*.tsx`: inspector, historial, autosave con revisión, recuperación y comparación.
- `src/server/`: autenticación, transacciones, autorización, medios y Mercado Pago.
- `supabase/migrations/`: tablas, RLS, snapshots inmutables y storage privado.
- `tests/`: pruebas de servicios y navegador. Cuentas y pagos de fixture son ficticios y aislados.
- `brand/`, `assets/backgrounds/`, `public/`: recursos propios de producción; fuentes con fallbacks explícitos.
- `research/`: evidencia pública del kit original, nunca importada ni servida por la aplicación.

Las reglas están en `AGENTS.md` y `PROMPT-CODEX.md`. No se inspeccionaron ni se afirma reproducir paneles privados del competidor. No se copió su código, marca ni contenido comercial.
# invitaciones-pixvo-tech
