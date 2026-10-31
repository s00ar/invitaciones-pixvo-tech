# Reglas para Codex
Leé PROMPT-CODEX.md y docs antes de implementar. El kit no es una app terminada.
- Implementá la plataforma completa, no solamente la landing.
- Mantené separación entre evidencia observada y decisiones propuestas.
- No afirmes paridad con paneles privados que no se inspeccionaron.
- No copies bundles, código privado, textos comerciales ni marca de Somos Web.
- Usá brand/ y assets/backgrounds/ para producción. research/media es solo referencia.
- Las invitaciones deben tener identidad propia configurable; la plataforma conserva la marca Pixvo.
- Persistencia real en base de datos, políticas por propietario, validación en servidor y pagos idempotentes.
- Nunca expongas secretos; no incluyas .env reales ni tokens en logs o fixtures.
- No despliegues ni ejecutes cobros reales por el solo hecho de implementar.
- Consultá documentación oficial vigente antes de fijar dependencias y contratos de proveedores.
- Cada hito debe quedar funcional, probado y con estado actualizado en docs/IMPLEMENTATION-STATUS.md.
- No simules éxito de funciones no conectadas; mostrá estado de configuración pendiente.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
