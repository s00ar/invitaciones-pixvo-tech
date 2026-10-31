# Medios y uso
- `brand/*.webp`: logos de la web Pixvo proporcionada como identidad del titular. Mantener marca y proporciones.
- `assets/backgrounds/*.svg`: composiciones nuevas creadas para este encargo; editables y sin imágenes externas.
- `research/media/*`: imágenes públicas del competidor, solo referencia de análisis. Licencia de reutilización NO verificada. No importar a la aplicación, no servir desde public/ ni presentar como diseños originales de Pixvo.
- Fuentes: nombres incluidos, archivos no incluidos. Obtener origen oficial y conservar licencia antes de redistribuir.
- No se incluyen canciones, fotografías de clientes ni videos de terceros como medios de producción.
- Cada recurso futuro debe tener origen, autor/licencia, uso autorizado y checksum. No usar hotlinks del competidor en la app.

## Recursos del producto implementado

scripts/sync-presets.mjs copia solo logos y SVG propios a public y genera public/assets/provenance.json con origen y SHA-256. Genera también src/domain/presets.json sin referencias comerciales del catálogo de investigación. El bundle usa esa proyección.

No se distribuyen fuentes: Urbanist/Inter Tight tienen fallback explícito a Trebuchet MS/Arial; presets serif usan Georgia. La selección conserva el nombre de fuente para permitir incorporar después archivos licenciados. Fotografías, música y videos solo provienen de uploads autorizados del cliente. No hay contenido remoto de ejemplo de terceros.
