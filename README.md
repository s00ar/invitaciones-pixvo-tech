# Pixvo.Tech · Plataforma de invitaciones
Kit de implementación para Codex. Relevamiento: 31 de octubre de 2026.

**Este repositorio contiene especificaciones, evidencia pública, 27 presets y medios; no es una plataforma implementada.**
No incluye acceso al backend, editor privado ni código fuente de Somos Web. No se verificaron pagos ni persistencia de RSVP en ese servicio.

## Comenzar
1. Abrí esta carpeta en Codex.
2. Usá el prompt de `PROMPT-CODEX.md` completo (o pedile que lo lea y ejecute).
3. Codex debe implementar por hitos y registrar pruebas, pendientes y decisiones.

## Contenido
- `PROMPT-CODEX.md`: instrucciones completas de construcción.
- `AGENTS.md`: reglas del proyecto para las siguientes sesiones.
- `docs/`: producto, editor, arquitectura, datos, API, pruebas, despliegue y decisiones.
- `research/`: catálogo y estilos observados, referencias y medios originales de referencia.
- `brand/`: logos descargados de Pixvo y tokens verificados de su web.
- `templates/catalog.json`: 27 propuestas Pixvo configurables, con correspondencia al catálogo observado.
- `assets/backgrounds/`: 27 SVG propios editables, utilizables como fondos iniciales.
- `schemas/`: contratos JSON de invitación y template.
- `examples/`: documento ficticio de quince años.
- `scripts/validate.py`: validación estructural del kit, sin dependencias.
- `preview.html`: visor local del catálogo propuesto; no es el producto final.

## Verificación local
```sh
python scripts/validate.py
python -m http.server 8080
```
Abrí http://localhost:8080/preview.html para revisar los presets. El visor no crea invitaciones ni procesa pagos.

## Repositorio Git
La entrega incluye un repositorio Git local con commit inicial. No se creó un remoto en GitHub.
Si querés subirlo, con GitHub CLI instalado y autenticado:
```sh
gh repo create pixvo-invitaciones --private --source=. --remote=origin --push
```
Revisá la política de medios antes de hacerlo público. Los archivos de `research/media` son referencias con licencia no verificada; no deben terminar en el bundle público de la app.

## Certeza y alcance
`OBSERVADO`: visible en una página pública o su HTML servido.
`ANUNCIADO`: figura en la landing, pero no se comprobó funcionalmente.
`PROPUESTA`: diseño de producto para Pixvo; no describe cómo funciona internamente Somos Web.
`NO VERIFICADO`: flujo inaccesible o no probado. Todas las decisiones de implementación son propuestas.
