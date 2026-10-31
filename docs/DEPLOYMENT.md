# Instalación, despliegue y rollback propuestos
Codex debe completar los comandos reales una vez creada la app; hoy el kit solo requiere Python 3 para el visor/validación.

## Configuración pendiente
Runtime Node LTS compatible, gestor de paquetes y lockfile; proyecto Supabase y migraciones; Auth redirect allowlist; storage; credenciales Mercado Pago sandbox/producción; dominio y HTTPS; precios/entitlements; contactos de soporte; política de permanencia; correo transaccional si se integra; condiciones y privacidad propias revisadas por el titular.
No usar credenciales reales en el paquete ni copiar datos del competidor. El dominio invita.pixvo.tech es una propuesta, no se verificó ni configuró.

## Pipeline exigido
Instalación reproducible → lint/typecheck → tests → build → migraciones aditivas → staging → E2E sandbox → revisión → producción. Configurar backups de DB y medios y probar restauración. Separar entornos, usuarios y webhooks.
Revisión de dependencias, presupuesto de assets y logs con redacción de PII. Métricas: fallos de publicación, cola webhooks, upload y RSVP; no almacenar datos de tarjeta.

## Rollback
Mantener release anterior y migraciones compatibles. Feature flags para checkout/publicación; pausar nuevos cobros si hay incidente sin borrar pagos. Revertir frontend/servidor y apuntar snapshots a versión válida cuando corresponda. No ejecutar down migrations destructivas en producción. Reprocesar webhooks idempotentes luego de corregir.
