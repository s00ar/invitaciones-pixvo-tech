# Aceptación y pruebas de la futura app
El script del kit no ejecuta estas pruebas: Codex debe implementarlas.

## P0, bloqueantes
- Usuario A no puede leer ni editar eventos/medios/CSV/pagos de B; probar UI y API/RLS directamente.
- Crear XV desde catálogo, editar todos los datos, refrescar y reabrir desde otra sesión: persiste.
- Perder red durante autosave muestra error recuperable y no falso guardado; conflicto de dos pestañas devuelve 409.
- Cambio de template conserva nombres, fotos y fecha; revertir recupera estilos anteriores.
- Webhook duplicado/concurrente no duplica entitlement ni pago. Firma inválida, moneda/importe distintos y orden ajena se rechazan.
- Volver de checkout con success falso no publica ni marca pagado.
- Tras pagar sandbox, publicar genera URL y snapshot. Editar borrador no altera lo público hasta republicar.
- RSVP sí/no persiste; update autenticado por token no duplica; cupo validado; export coincide. CSV neutraliza =,+,-,@ y saltos peligrosos.
- Borrador nunca público por slug/API/cache. Secretos ausentes en bundles y logs.

## P1, producto
- 27 templates visibles con filtros correctos y estilos distintos; cada uno seleccionable/editable/publicable.
- Familias editorial, ornamental, fiesta, infantil y corporativa con composición propia.
- Preview y público equivalentes para mismo documento; revisar 360,390,768 y1440 px sin scroll horizontal.
- QR escaneable abre la URL correcta; ICS importa hora correcta incluso en cambio horario; contador no negativo.
- Upload inválido/sobredimensionado rechazado en servidor; ninguna URL javascript se renderiza.
- Música requiere gesto, pausa funciona; Spotify no se confunde con audio propio; video tiene poster/fallback.
- Campos vacíos no dejan secciones vacías; textos largos no desbordan; todos los formularios usables con teclado.
- Tres ediciones configuradas: autosave no consume, republicar consume una, el cuarto intento bloquea en servidor; rollback definido.
- Invitación pausada/vencida rechaza RSVP y no filtra datos privados; cache se invalida.

## Evidencias de entrega
Registrar comandos y salida real de lint, typecheck, unit/integration y E2E. Capturas de landing, catálogo, editor desktop/mobile, publicación y dashboard RSVP con datos ficticios. Documentar fallos y pasos para reproducir, sin afirmar que pruebas omitidas pasaron.
