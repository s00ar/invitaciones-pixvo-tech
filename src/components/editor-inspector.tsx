"use client";
import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Upload } from "lucide-react";
import {
  applySample,
  categories,
  families,
  fonts,
  templates,
  changeTemplate,
  type InvitationDocument,
  type Block,
  blockLabels,
} from "@/domain/document";
import { customSamples, type SampleStyle } from "@/domain/custom-samples";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { api } from "./auth";
import { Notice } from "./ui";
import { VideoGuidance } from "./video-guidance";
import {
  mediaAccept,
  mediaLimits,
  mediaLibraryLimit,
  mediaSelectionError,
} from "@/domain/media-policy";
type Media = { id: string; mime: string; bytes: number; filename: string };
type Props = {
  id: string;
  d: InvitationDocument;
  selected: string;
  change: (f: (d: InvitationDocument) => InvitationDocument) => void;
};
function Field({
  label,
  value,
  onChange,
  type = "text",
  max = 500,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  max?: number;
}) {
  return (
    <label className="field">
      {label}
      {type === "textarea" ? (
        <textarea
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function CheckField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="check-field">
      <input
        type="checkbox"
        disabled={disabled}
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
export function EditorInspector({ id, d, selected, change }: Props) {
  const filePicker = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<Media[]>([]),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false),
    [authorized, setAuthorized] = useState(false),
    [pendingTemplate, setPendingTemplate] = useState("");
  useEffect(() => {
    api<Media[]>(`/api/invitations/${id}/media`)
      .then(setMedia)
      .catch((e) => setError(e.message));
  }, [id]);
  const theme = <K extends keyof InvitationDocument["theme"]>(
    k: K,
    v: InvitationDocument["theme"][K],
  ) => change((d) => ({ ...d, theme: { ...d.theme, [k]: v } }));
  const event = <K extends keyof InvitationDocument["event"]>(
    k: K,
    v: InvitationDocument["event"][K],
  ) => change((d) => ({ ...d, event: { ...d.event, [k]: v } }));
  const b = d.blocks.find((b) => b.id === selected);
  const prop = <K extends keyof Block["props"]>(k: K, v: Block["props"][K]) =>
    change((d) => ({
      ...d,
      blocks: d.blocks.map((x) =>
        x.id === selected ? { ...x, props: { ...x.props, [k]: v } } : x,
      ),
    }));
  const mediaSelect = (
    label: string,
    value: string | undefined,
    onChange: (s: string | undefined) => void,
    mime: string,
  ) => (
    <label className="field">
      {label}
      <select
        value={value ?? ""}
        aria-describedby={
          mime === "video/" ? "video-background-help" : undefined
        }
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">Sin archivo</option>
        {media
          .filter((m) => m.mime.startsWith(mime))
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.filename}
            </option>
          ))}
      </select>
    </label>
  );
  return (
    <aside className="inspector">
      <h2>
        {selected === "event"
          ? "Tu evento"
          : selected === "theme"
            ? "Estilo y diseño"
            : selected === "media"
              ? "Tus archivos"
              : b
                ? blockLabels[b.type]
                : "Seleccioná un bloque"}
      </h2>
      {error && <Notice error>{error}</Notice>}
      <div className="form-grid">
        {selected === "event" && (
          <>
            <Field
              label="Nombre del evento"
              value={d.event.title}
              max={120}
              onChange={(v) => event("title", v)}
            />
            <label className="field">
              Tipo de evento
              <select
                value={d.event.category}
                onChange={(e) =>
                  event(
                    "category",
                    e.target.value as InvitationDocument["event"]["category"],
                  )
                }
              >
                {Object.entries(categories).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Anfitriones (uno por línea)"
              type="textarea"
              value={d.event.hosts.join("\n")}
              onChange={(v) => event("hosts", v.split("\n").slice(0, 10))}
            />
            <Field
              label="Mensaje del evento"
              type="textarea"
              max={2000}
              value={d.event.message}
              onChange={(v) => event("message", v)}
            />
            <Field
              label="Fecha y hora de inicio"
              type="datetime-local"
              value={formatInTimeZone(
                d.event.startsAt,
                d.event.timezone,
                "yyyy-MM-dd'T'HH:mm",
              )}
              onChange={(v) => {
                if (v)
                  event(
                    "startsAt",
                    fromZonedTime(v, d.event.timezone).toISOString(),
                  );
              }}
            />
            <Field
              label="Fecha y hora de fin (opcional)"
              type="datetime-local"
              value={
                d.event.endsAt
                  ? formatInTimeZone(
                      d.event.endsAt,
                      d.event.timezone,
                      "yyyy-MM-dd'T'HH:mm",
                    )
                  : ""
              }
              onChange={(v) =>
                event(
                  "endsAt",
                  v ? fromZonedTime(v, d.event.timezone).toISOString() : null,
                )
              }
            />
            <label className="field">
              Zona horaria
              <select
                value={d.event.timezone}
                onChange={(e) => event("timezone", e.target.value)}
              >
                {Array.from(
                  new Set([
                    d.event.timezone,
                    "America/Argentina/Buenos_Aires",
                    "America/Mexico_City",
                    "America/Bogota",
                    "America/Santiago",
                    "America/Montevideo",
                    "Europe/Madrid",
                    "Europe/Rome",
                    "UTC",
                  ]),
                ).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <small>
                Los horarios se interpretan en esta zona. Al cambiarla se
                conserva el instante del evento.
              </small>
            </label>
            <Field
              label="Descripción para compartir"
              value={d.event.description ?? ""}
              max={300}
              onChange={(v) => event("description", v)}
            />
          </>
        )}
        {selected === "theme" && (
          <>
            <label className="field">
              Muestra personalizada XV
              <select
                aria-label="Muestra personalizada XV"
                value={d.theme.sampleStyle ?? ""}
                onChange={(e) => {
                  if (e.target.value)
                    change((d) =>
                      applySample(d, e.target.value as SampleStyle),
                    );
                  else theme("sampleStyle", undefined);
                }}
              >
                <option value="">Diseño del template</option>
                {customSamples.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <small>
                Conserva los datos, bloques, fotos y respuestas; cambia la
                apariencia. Podés deshacer.
              </small>
            </label>
            <label className="field">
              Template
              <select
                aria-label="Template"
                value={pendingTemplate || d.templateId}
                onChange={(e) => setPendingTemplate(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            {pendingTemplate && pendingTemplate !== d.templateId && (
              <Notice>
                Cambia la composición, los colores y las fuentes. Se conservan
                nombres, fecha, bloques, archivos y respuestas. Podés deshacer.
                <button
                  className="button primary"
                  onClick={() => {
                    change((d) => changeTemplate(d, pendingTemplate));
                    setPendingTemplate("");
                  }}
                >
                  Aplicar este diseño
                </button>
                <button
                  className="button ghost"
                  onClick={() => setPendingTemplate("")}
                >
                  Cancelar
                </button>
              </Notice>
            )}
            <label className="field">
              Composición
              <select
                value={d.theme.family}
                onChange={(e) =>
                  theme(
                    "family",
                    e.target.value as InvitationDocument["theme"]["family"],
                  )
                }
              >
                {Object.entries(families).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <small>
                Los diseños «a tu manera» permiten elegir todos los estilos
                desde el inicio.
              </small>
            </label>
            <div className="two-col">
              <Field
                type="color"
                label="Color de acento"
                value={d.theme.accent}
                onChange={(v) => theme("accent", v)}
              />
              <Field
                type="color"
                label="Fondo"
                value={d.theme.background}
                onChange={(v) => theme("background", v)}
              />
            </div>
            <Field
              type="color"
              label="Texto"
              value={d.theme.foreground}
              onChange={(v) => theme("foreground", v)}
            />
            {(["headingFont", "bodyFont"] as const).map((k, i) => (
              <label className="field" key={k}>
                {i ? "Fuente del cuerpo" : "Fuente de títulos"}
                <select
                  value={d.theme[k]}
                  onChange={(e) =>
                    theme(k, e.target.value as (typeof fonts)[number])
                  }
                >
                  {fonts.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <small>
                  Fallback local explícito: serif → Georgia; sans →
                  Arial/Trebuchet.
                </small>
              </label>
            ))}
            <label className="field">
              Fondo propio
              <select
                value={d.theme.backgroundAsset}
                onChange={(e) => theme("backgroundAsset", e.target.value)}
              >
                <option value="">Color liso</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.backgroundAsset}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            {mediaSelect(
              "Foto de fondo",
              d.theme.backgroundMediaId,
              (v) => theme("backgroundMediaId", v),
              "image/",
            )}
            {mediaSelect(
              "Video de fondo (según plan)",
              d.theme.videoId,
              (v) => theme("videoId", v),
              "video/",
            )}
            <VideoGuidance id="video-background-help" />
            <CheckField
              label="Reproducción automática sin sonido"
              value={d.theme.videoAutoplay ?? false}
              onChange={(value) => theme("videoAutoplay", value)}
              disabled={!d.theme.videoId}
            />
            <CheckField
              label="Reproducir video en bucle"
              value={d.theme.videoLoop ?? false}
              onChange={(value) => theme("videoLoop", value)}
              disabled={!d.theme.videoId}
            />
            <small>
              El visitante puede pausar el video y activar el sonido. Si su
              navegador bloquea el inicio automático, puede tocar Reproducir
              video.
            </small>
            {mediaSelect(
              "Poster del video",
              d.theme.posterId,
              (v) => theme("posterId", v),
              "image/",
            )}
            <label className="field">
              <span>
                Tamaño de botones:{" "}
                {Math.round((d.theme.buttonScale ?? 1) * 100)}%
              </span>
              <input
                aria-label="Tamaño de botones"
                type="range"
                min={70}
                max={125}
                step={5}
                value={Math.round((d.theme.buttonScale ?? 1) * 100)}
                onChange={(e) =>
                  theme("buttonScale", Number(e.target.value) / 100)
                }
              />
              <small>
                Ajusta los botones de la invitación y los íconos de video, sin
                cambiar el tamaño de los títulos.
              </small>
            </label>
            {(
              [
                "overlay",
                "focusX",
                "focusY",
                "radius",
                "scale",
                "spacing",
              ] as const
            ).map((k, i) => (
              <label className="field" key={k}>
                {
                  [
                    "Oscurecer fondo",
                    "Foco horizontal",
                    "Foco vertical",
                    "Radio de bordes",
                    "Escala tipográfica",
                    "Espaciado",
                  ][i]
                }
                <input
                  type="range"
                  min={k === "scale" ? 0.7 : k === "spacing" ? 0.5 : 0}
                  max={
                    k === "overlay"
                      ? 0.9
                      : k === "radius"
                        ? 80
                        : k === "scale"
                          ? 1.5
                          : k === "spacing"
                            ? 2
                            : 100
                  }
                  step={["overlay", "scale", "spacing"].includes(k) ? 0.05 : 1}
                  value={d.theme[k]}
                  onChange={(e) => theme(k, Number(e.target.value))}
                />
              </label>
            ))}
            <label className="field">
              Alineación
              <select
                value={d.theme.align}
                onChange={(e) =>
                  theme(
                    "align",
                    e.target.value as InvitationDocument["theme"]["align"],
                  )
                }
              >
                <option value="left">Izquierda</option>
                <option value="center">Centro</option>
                <option value="right">Derecha</option>
              </select>
            </label>
          </>
        )}
        {selected === "media" && (
          <>
            <p className="notice" id="media-upload-limits">
              JPG, PNG y WebP: máximo {mediaLimits.image / 1e6} MB. MP3: máximo{" "}
              {mediaLimits.audio / 1e6} MB. MP4 y WebM: máximo{" "}
              {mediaLimits.video / 1e6} MB. Cuota total:{" "}
              {mediaLibraryLimit / 1e6} MB por evento. Las imágenes se optimizan
              y se eliminan los metadatos.
            </p>
            <VideoGuidance id="video-upload-help" />
            <CheckField
              label="Tengo autorización para usar estos archivos"
              value={authorized}
              onChange={setAuthorized}
            />
            <button
              type="button"
              className="button ghost"
              disabled={uploading || !authorized}
              onClick={() => filePicker.current?.click()}
            >
              <Upload size={14} />
              {uploading ? "Subiendo…" : "Subir archivo"}
            </button>
            <input
              ref={filePicker}
              hidden
              type="file"
              disabled={uploading || !authorized}
              accept={mediaAccept}
              aria-label="Seleccionar archivo"
              aria-describedby="media-upload-limits video-upload-help"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.currentTarget.value = "";
                if (!file) return;
                setError("");
                const selectionError = mediaSelectionError(file);
                if (selectionError) {
                  setError(selectionError);
                  return;
                }
                setUploading(true);
                const form = new FormData();
                form.set("file", file);
                form.set("authorized", String(authorized));
                try {
                  const m = await api<Media>(
                    `/api/invitations/${id}/media`,
                    "POST",
                    form,
                  );
                  setMedia((prev) => [m, ...prev]);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setUploading(false);
                }
              }}
            />
            <div className="media-grid">
              {media.map((m) => (
                <div className="media-item" key={m.id}>
                  {m.mime.startsWith("image/") ? (
                    <img
                      src={`/api/media/${m.id}`}
                      alt={m.filename}
                      width="150"
                      height="100"
                    />
                  ) : (
                    <span>
                      {m.mime.startsWith("video/") ? "Video" : "Audio"}
                    </span>
                  )}
                  <p>{m.filename}</p>
                  <button
                    className="button ghost"
                    onClick={async () => {
                      try {
                        await api(`/api/media/${m.id}`, "DELETE");
                        setMedia((prev) => prev.filter((x) => x.id !== m.id));
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <Trash2 size={12} />
                    Retirar
                  </button>
                </div>
              ))}
            </div>
            <small>
              Elegí los archivos desde Estilo, Galería o Música. Los recursos de
              versiones publicadas se conservan.
            </small>
          </>
        )}
        {b && (
          <>
            <CheckField
              label={
                ["hero", "rsvp"].includes(b.type)
                  ? "Bloque obligatorio"
                  : "Mostrar bloque"
              }
              disabled={["hero", "rsvp"].includes(b.type)}
              value={b.enabled}
              onChange={(v) =>
                change((d) => ({
                  ...d,
                  blocks: d.blocks.map((x) =>
                    x.id === b.id ? { ...x, enabled: v } : x,
                  ),
                }))
              }
            />
            {b.type === "hero" ? (
              <Field
                label="Texto superior"
                value={b.props.eyebrow ?? ""}
                max={80}
                onChange={(v) => prop("eyebrow", v)}
              />
            ) : (
              <Field
                label="Título del bloque"
                value={b.props.title ?? ""}
                max={120}
                onChange={(v) => prop("title", v)}
              />
            )}
            {["message", "dressCode", "gifts", "rsvp"].includes(b.type) && (
              <Field
                label="Texto"
                type="textarea"
                max={2000}
                value={b.props.text ?? ""}
                onChange={(v) => prop("text", v)}
              />
            )}
            {["venues", "agenda"].includes(b.type) && (
              <>
                {(b.props.items ?? []).map((item, i) => (
                  <div className="item-edit" key={i}>
                    <Field
                      label={
                        b.type === "venues" ? "Nombre del lugar" : "Actividad"
                      }
                      value={item.name}
                      max={120}
                      onChange={(v) =>
                        prop(
                          "items",
                          b.props.items!.map((x, n) =>
                            n === i ? { ...x, name: v } : x,
                          ),
                        )
                      }
                    />
                    <Field
                      label="Hora / etiqueta"
                      value={item.time ?? ""}
                      max={40}
                      onChange={(v) =>
                        prop(
                          "items",
                          b.props.items!.map((x, n) =>
                            n === i ? { ...x, time: v } : x,
                          ),
                        )
                      }
                    />
                    {b.type === "venues" ? (
                      <>
                        <Field
                          label="Dirección"
                          value={item.address ?? ""}
                          max={300}
                          onChange={(v) =>
                            prop(
                              "items",
                              b.props.items!.map((x, n) =>
                                n === i ? { ...x, address: v } : x,
                              ),
                            )
                          }
                        />
                        <Field
                          label="Enlace a Maps (HTTPS)"
                          value={item.url ?? ""}
                          max={1000}
                          onChange={(v) =>
                            prop(
                              "items",
                              b.props.items!.map((x, n) =>
                                n === i ? { ...x, url: v } : x,
                              ),
                            )
                          }
                        />
                      </>
                    ) : (
                      <Field
                        label="Descripción"
                        value={item.description ?? ""}
                        onChange={(v) =>
                          prop(
                            "items",
                            b.props.items!.map((x, n) =>
                              n === i ? { ...x, description: v } : x,
                            ),
                          )
                        }
                      />
                    )}
                    <button
                      className="link-button"
                      onClick={() =>
                        prop(
                          "items",
                          b.props.items!.filter((_, n) => n !== i),
                        )
                      }
                    >
                      <Trash2 size={12} />
                      Quitar
                    </button>
                  </div>
                ))}
                <button
                  className="button ghost"
                  onClick={() =>
                    prop("items", [...(b.props.items ?? []), { name: "" }])
                  }
                >
                  <Plus size={12} />
                  Agregar {b.type === "venues" ? "lugar" : "actividad"}
                </button>
              </>
            )}
            {b.type === "rsvp" && (
              <>
                <label className="field">
                  Modalidad
                  <select
                    value={b.props.mode ?? "open"}
                    onChange={(e) =>
                      prop("mode", e.target.value as "open" | "guest")
                    }
                  >
                    <option value="open">Enlace abierto</option>
                    <option value="guest">
                      Solo invitados con enlace personal
                    </option>
                  </select>
                  <small>
                    {b.props.mode === "guest"
                      ? "Creá los enlaces desde Invitados."
                      : "El enlace puede reenviarse. Se limita la frecuencia de respuestas."}
                  </small>
                </label>
                <Field
                  type="number"
                  label="Máximo por respuesta abierta"
                  value={b.props.maxAttendees ?? 2}
                  onChange={(v) => prop("maxAttendees", Number(v))}
                />
                <Field
                  type="number"
                  label="Capacidad total (vacío = sin cupo total)"
                  value={b.props.capacity ?? ""}
                  onChange={(v) => prop("capacity", v ? Number(v) : undefined)}
                />
                <Field
                  type="datetime-local"
                  label="Cierre de confirmaciones"
                  value={
                    b.props.closesAt
                      ? formatInTimeZone(
                          b.props.closesAt,
                          d.event.timezone,
                          "yyyy-MM-dd'T'HH:mm",
                        )
                      : ""
                  }
                  onChange={(v) =>
                    prop(
                      "closesAt",
                      v
                        ? fromZonedTime(v, d.event.timezone).toISOString()
                        : undefined,
                    )
                  }
                />
                <CheckField
                  label="Pedir preferencias alimentarias"
                  value={b.props.askDiet ?? false}
                  onChange={(v) => prop("askDiet", v)}
                />
                <Field
                  label="WhatsApp adicional (número internacional)"
                  value={b.props.whatsapp ?? ""}
                  max={16}
                  onChange={(v) => prop("whatsapp", v)}
                />
              </>
            )}
            {b.type === "gifts" && (
              <>
                <Field
                  label="Alias / CBU"
                  value={b.props.alias ?? ""}
                  max={100}
                  onChange={(v) => prop("alias", v)}
                />
                <Field
                  label="Titular"
                  value={b.props.holder ?? ""}
                  max={100}
                  onChange={(v) => prop("holder", v)}
                />
                <Field
                  label="Lista de regalos (HTTPS)"
                  value={b.props.url ?? ""}
                  max={1000}
                  onChange={(v) => prop("url", v)}
                />
              </>
            )}
            {b.type === "social" && (
              <>
                <Field
                  label="Instagram (HTTPS)"
                  value={b.props.url ?? ""}
                  max={1000}
                  onChange={(v) => prop("url", v)}
                />
                <Field
                  label="Hashtag"
                  value={b.props.hashtag ?? ""}
                  max={100}
                  onChange={(v) => prop("hashtag", v)}
                />
              </>
            )}
            {b.type === "music" && (
              <>
                {mediaSelect(
                  "Audio autorizado (según plan)",
                  b.props.audioId,
                  (v) => prop("audioId", v),
                  "audio/",
                )}
                <Field
                  label="Enlace de Spotify"
                  value={b.props.spotify ?? ""}
                  max={1000}
                  onChange={(v) => prop("spotify", v)}
                />
                <label className="field">
                  Volumen
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={b.props.volume ?? 0.5}
                    onChange={(e) => prop("volume", Number(e.target.value))}
                  />
                </label>
                <small>
                  Spotify abre su reproductor. El audio directo siempre empieza
                  apagado.
                </small>
              </>
            )}
            {b.type === "gallery" && (
              <>
                {(b.props.photos ?? []).map((photo, i) => (
                  <div
                    className="item-edit gallery-edit-item"
                    key={`${photo.mediaId}-${i}`}
                  >
                    <img
                      src={`/api/media/${photo.mediaId}`}
                      width="250"
                      height="90"
                      alt={photo.alt}
                    />
                    <Field
                      label="Texto alternativo"
                      value={photo.alt}
                      max={160}
                      onChange={(v) =>
                        prop(
                          "photos",
                          b.props.photos!.map((p, n) =>
                            n === i ? { ...p, alt: v } : p,
                          ),
                        )
                      }
                    />
                    <Field
                      label="Leyenda"
                      value={photo.caption ?? ""}
                      max={300}
                      onChange={(v) =>
                        prop(
                          "photos",
                          b.props.photos!.map((p, n) =>
                            n === i ? { ...p, caption: v } : p,
                          ),
                        )
                      }
                    />
                    {(["focusX", "focusY"] as const).map((k) => (
                      <label className="field" key={k}>
                        {k === "focusX"
                          ? "Recorte horizontal"
                          : "Recorte vertical"}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={photo[k] ?? 50}
                          onChange={(e) =>
                            prop(
                              "photos",
                              b.props.photos!.map((p, n) =>
                                n === i
                                  ? { ...p, [k]: Number(e.target.value) }
                                  : p,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                    <div className="inline-actions">
                      {[-1, 1].map((dir) => (
                        <button
                          className="icon-button"
                          aria-label={dir === -1 ? "Subir foto" : "Bajar foto"}
                          key={dir}
                          disabled={
                            i + dir < 0 || i + dir >= b.props.photos!.length
                          }
                          onClick={() => {
                            const photos = [...b.props.photos!];
                            [photos[i], photos[i + dir]] = [
                              photos[i + dir],
                              photos[i],
                            ];
                            prop("photos", photos);
                          }}
                        >
                          {dir === -1 ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          )}
                        </button>
                      ))}
                      <button
                        className="link-button"
                        onClick={() =>
                          prop(
                            "photos",
                            b.props.photos!.filter((_, n) => n !== i),
                          )
                        }
                      >
                        <Trash2 size={12} />
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
                {mediaSelect(
                  "Agregar foto de la biblioteca",
                  undefined,
                  (v) => {
                    if (v)
                      prop("photos", [
                        ...(b.props.photos ?? []),
                        { mediaId: v, alt: "" },
                      ]);
                  },
                  "image/",
                )}
                <small>
                  Subí fotos desde Archivos. Cada plan se valida antes de
                  publicar.
                </small>
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
