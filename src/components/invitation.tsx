"use client";
import Link from "next/link";
import { useState, useEffect, type CSSProperties } from "react";
import {
  CalendarDays,
  MapPin,
  ArrowUpRight,
  Heart,
  Music,
  Gift,
  Check,
  Copy,
  Shirt,
  Play,
  Pause,
  LoaderCircle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRef } from "react";
import type { InvitationDocument, Block } from "@/domain/document";
import { dateLabel } from "@/domain/format";
import { customSamples } from "@/domain/custom-samples";
import { SampleMotif } from "./sample-motif";
const serif = [
  "Playfair Display",
  "DM Serif Display",
  "Cinzel",
  "Cormorant Garamond",
  "Lora",
  "Georgia",
];
export function fontStack(name: string) {
  return serif.includes(name)
    ? `"${name}", Georgia, serif`
    : `"${name}", "Trebuchet MS", Arial, sans-serif`;
}
const mediaURL = (id: string, slug?: string) =>
  `/api/media/${id}${slug ? `?slug=${encodeURIComponent(slug)}` : ""}`;
function Countdown({ date }: { date: string }) {
  const [diff, setDiff] = useState<number | null>(null);
  useEffect(() => {
    const update = () =>
      setDiff(Math.max(0, new Date(date).getTime() - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [date]);
  if (diff === 0) return <p className="countdown-ended">¡Llegó el gran día!</p>;
  const values =
    diff === null
      ? ["—", "—", "—", "—"]
      : [
          Math.floor(diff / 86400000),
          Math.floor(diff / 3600000) % 24,
          Math.floor(diff / 60000) % 60,
          Math.floor(diff / 1000) % 60,
        ];
  return (
    <div
      className="countdown"
      style={
        {
          "--countdown-digits": Math.max(
            2,
            ...values.map((n) => String(n).length),
          ),
        } as CSSProperties
      }
    >
      {values.map((n, i) => (
        <div key={i}>
          <strong>{String(n).padStart(2, "0")}</strong>
          <span>{["días", "horas", "minutos", "segundos"][i]}</span>
        </div>
      ))}
    </div>
  );
}
function Hero({
  d,
  b,
  slug,
}: {
  d: InvitationDocument;
  b: Block;
  slug?: string;
}) {
  const player = useRef<HTMLVideoElement>(null),
    [videoPlaying, setVideoPlaying] = useState(false),
    [videoLoading, setVideoLoading] = useState(false),
    [videoMuted, setVideoMuted] = useState(Boolean(d.theme.videoAutoplay)),
    [videoError, setVideoError] = useState("");
  useEffect(() => {
    if (!videoLoading) return;
    const timer = setTimeout(() => {
      player.current?.pause();
      setVideoLoading(false);
      setVideoPlaying(false);
      setVideoError(
        "El video está tardando en cargar. Revisá tu conexión, reintentá o abrilo por separado.",
      );
    }, 20000);
    return () => clearTimeout(timer);
  }, [videoLoading]);
  const date = dateLabel(d, false);
  const title = <h1>{d.event.title}</h1>;
  const common = (
    <>
      <p className="inv-eyebrow">{b.props.eyebrow || "Estás invitado"}</p>
      {title}
      {d.event.hosts.length > 0 && (
        <p className="inv-small">{d.event.hosts.join(" · ")}</p>
      )}
      <p className="inv-date">{date}</p>
      {d.theme.sampleStyle && d.event.message && (
        <p className="sample-quote">{d.event.message}</p>
      )}
      <a className="inv-button" href="#confirmacion">
        Quiero ser parte <ArrowUpRight size={16} />
      </a>
      {d.theme.videoId && (
        <button
          type="button"
          className="inv-button video-toggle"
          aria-label={
            videoLoading
              ? "Cargando video…"
              : videoPlaying
                ? "Pausar video"
                : "Reproducir video"
          }
          title={
            videoLoading
              ? "Cargando video…"
              : videoPlaying
                ? "Pausar video"
                : "Reproducir video"
          }
          disabled={videoLoading}
          onClick={async () => {
            try {
              if (!player.current) return;
              if (videoPlaying) player.current.pause();
              else {
                if (videoError || player.current.error) player.current.load();
                setVideoError("");
                setVideoLoading(true);
                await player.current.play();
              }
            } catch (error) {
              // A pause, source change or timeout can cancel a pending play.
              if (error instanceof DOMException && error.name === "AbortError")
                return;
              setVideoLoading(false);
              setVideoPlaying(false);
              setVideoError(
                "El video no está disponible. Podés consultar los datos del evento debajo.",
              );
            }
          }}
        >
          {videoLoading ? (
            <LoaderCircle size={18} aria-hidden="true" />
          ) : videoPlaying ? (
            <Pause size={18} aria-hidden="true" />
          ) : (
            <Play size={18} aria-hidden="true" />
          )}
        </button>
      )}
      {videoLoading && (
        <p role="status" className="inv-small">
          Cargando video. Si la conexión tarda, vas a poder reintentar.
        </p>
      )}
      {d.theme.videoId && (
        <button
          type="button"
          className="inv-button video-toggle"
          aria-label={videoMuted ? "Activar sonido" : "Silenciar video"}
          title={videoMuted ? "Activar sonido" : "Silenciar video"}
          onClick={() => {
            if (!player.current) return;
            player.current.muted = !player.current.muted;
            setVideoMuted(player.current.muted);
          }}
        >
          {videoMuted ? (
            <VolumeX size={18} aria-hidden="true" />
          ) : (
            <Volume2 size={18} aria-hidden="true" />
          )}
        </button>
      )}
      {videoError && (
        <p role="status" className="inv-small">
          {videoError}{" "}
          <a
            href={mediaURL(d.theme.videoId!, slug)}
            target="_blank"
            rel="noreferrer"
          >
            Abrir video por separado ↗
          </a>
        </p>
      )}
    </>
  );
  const bg = d.theme.backgroundMediaId
    ? mediaURL(d.theme.backgroundMediaId, slug)
    : d.theme.backgroundAsset
      ? `/${d.theme.backgroundAsset}`
      : undefined;
  return (
    <section
      className={`inv-hero hero-${d.theme.family} ${d.theme.videoId ? "has-hero-video" : ""}`}
      style={{
        backgroundImage: bg
          ? `linear-gradient(rgb(0 0 0 / ${d.theme.overlay}),rgb(0 0 0 / ${d.theme.overlay})),url("${bg}")`
          : undefined,
        backgroundPosition: `${d.theme.focusX}% ${d.theme.focusY}%`,
      }}
    >
      {d.theme.videoId && (
        <>
          <video
            ref={player}
            src={mediaURL(d.theme.videoId, slug)}
            className="hero-video"
            aria-label="Video del evento"
            style={{ objectPosition: `${d.theme.focusX}% ${d.theme.focusY}%` }}
            onPlay={() => {
              setVideoError("");
              setVideoLoading(true);
            }}
            onWaiting={(event) => {
              if (!event.currentTarget.paused) setVideoLoading(true);
            }}
            onPlaying={() => {
              setVideoLoading(false);
              setVideoPlaying(true);
              setVideoError("");
            }}
            onPause={() => {
              setVideoLoading(false);
              setVideoPlaying(false);
            }}
            onEnded={() => {
              setVideoLoading(false);
              setVideoPlaying(false);
            }}
            onError={(event) => {
              setVideoLoading(false);
              setVideoPlaying(false);
              setVideoError(
                event.currentTarget.error?.code === 3 ||
                  event.currentTarget.error?.code === 4
                  ? "No se puede reproducir este archivo. Probá con MP4 (H.264) o WebM."
                  : "El video no está disponible. Los detalles del evento están debajo.",
              );
            }}
            autoPlay={Boolean(d.theme.videoAutoplay)}
            loop={Boolean(d.theme.videoLoop)}
            muted={videoMuted}
            onVolumeChange={(event) => setVideoMuted(event.currentTarget.muted)}
            playsInline
            preload={d.theme.videoAutoplay ? "auto" : "metadata"}
            poster={d.theme.posterId ? mediaURL(d.theme.posterId, slug) : bg}
          >
            Tu navegador no reproduce este video. La información del evento está
            disponible debajo.
          </video>
          <div
            className="hero-video-shade"
            aria-hidden="true"
            style={{ backgroundColor: `rgb(0 0 0 / ${d.theme.overlay})` }}
          />
        </>
      )}
      <div className="hero-content">
        {d.theme.sampleStyle ? (
          <div className="sample-hero-content">
            <SampleMotif style={d.theme.sampleStyle} />
            {common}
          </div>
        ) : d.theme.family === "editorial" ? (
          <>
            <div className="editorial-label">
              <span>UNA HISTORIA PARA COMPARTIR</span>
              <span>01 / EL ENCUENTRO</span>
            </div>
            <div className="editorial-title">{common}</div>
            <p className="hero-footnote">
              Guardá esta fecha. Lo mejor está por venir.
            </p>
          </>
        ) : d.theme.family === "ornamental" ? (
          <div className="ornamental-frame">
            <Heart size={23} strokeWidth={1} />
            <div className="ornamental-rule" />
            {common}
            <span className="ornamental-star">✦</span>
          </div>
        ) : d.theme.family === "party" ? (
          <>
            <div className="party-ticket">SAVE THE DATE ↗ SAVE THE DATE ↗</div>
            <div className="party-title">{common}</div>
            <div className="party-bottom">UNA NOCHE · TODOS LOS RECUERDOS</div>
          </>
        ) : d.theme.family === "kids" ? (
          <>
            <span className="kid-star one">✦</span>
            <span className="kid-star two">★</span>
            <div className="kids-circle">{common}</div>
            <span className="kid-sticker">¡Te espero!</span>
          </>
        ) : (
          <>
            <div className="corporate-top">
              <span>CONEXIONES QUE IMPORTAN</span>
              <span>↗</span>
            </div>
            <div className="corporate-title">{common}</div>
            <div className="corporate-bottom">
              <span>IDEAS / PERSONAS / ENCUENTROS</span>
              <span>{new Date(d.event.startsAt).getUTCFullYear()}</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
function RSVP({ slug, b, guest }: { slug?: string; b: Block; guest?: string }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false),
    [receipt, setReceipt] = useState(guest ?? ""),
    [response, setResponse] = useState("yes");
  useEffect(() => {
    if (slug && !guest)
      queueMicrotask(() => {
        try {
          setReceipt(localStorage.getItem(`pixvo-rsvp:${slug}`) ?? "");
        } catch {
          /* Storage may be disabled by the visitor. */
        }
      });
  }, [slug, guest]);
  return (
    <section id="confirmacion" className="inv-section rsvp-section">
      <p className="inv-eyebrow">Un lugar para vos</p>
      <h2>{b.props.title || "¿Nos acompañás?"}</h2>
      <p>{b.props.text || "Tu respuesta nos ayuda a preparar este momento."}</p>
      {!slug ? (
        <div className="preview-notice">
          Vista previa · las respuestas se habilitan al publicar
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            const f = new FormData(e.currentTarget);
            try {
              const r = await fetch(`/api/public/${slug}/rsvp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: f.get("name"),
                  response,
                  attendees: response === "no" ? 0 : Number(f.get("attendees")),
                  diet: f.get("diet") ?? "",
                  message: f.get("message") ?? "",
                  website: f.get("website") ?? "",
                  ...(receipt ? { token: receipt } : {}),
                }),
              });
              const data = await r.json();
              if (!r.ok) throw new Error(data.error);
              setReceipt(data.token);
              try {
                localStorage.setItem(`pixvo-rsvp:${slug}`, data.token);
              } catch {
                /* A storage failure does not undo a persisted RSVP. */
              }
              setError(false);
              setMessage(data.message);
            } catch (err) {
              setError(true);
              setMessage(
                err instanceof Error
                  ? err.message
                  : "No se pudo guardar tu respuesta",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Tu nombre
            <input name="name" required maxLength={120} autoComplete="name" />
          </label>
          <div className="response-options">
            <label>
              <input
                type="radio"
                name="response"
                value="yes"
                checked={response === "yes"}
                onChange={() => setResponse("yes")}
              />{" "}
              Sí, voy a estar
            </label>
            <label>
              <input
                type="radio"
                name="response"
                value="no"
                checked={response === "no"}
                onChange={() => setResponse("no")}
              />{" "}
              No puedo asistir
            </label>
          </div>
          {response === "yes" && (
            <label>
              Personas, incluyéndote
              <input
                name="attendees"
                type="number"
                min="1"
                max="20"
                defaultValue="1"
                required
              />
              <small>El cupo de tu enlace se verifica al guardar.</small>
            </label>
          )}
          {b.props.askDiet && (
            <label>
              Preferencias alimentarias <span>(opcional)</span>
              <input name="diet" maxLength={500} />
            </label>
          )}
          <label>
            Un mensaje <span>(opcional)</span>
            <textarea name="message" maxLength={1000} />
          </label>
          <label className="honeypot" aria-hidden="true">
            Sitio web
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <button className="inv-button" disabled={busy}>
            {busy
              ? "Guardando…"
              : receipt
                ? "Actualizar respuesta"
                : "Confirmar respuesta"}
            <Check size={16} />
          </button>
          <small>
            El organizador recibirá estos datos para gestionar el evento.
          </small>
        </form>
      )}
      {message && (
        <p role={error ? "alert" : "status"} className="form-feedback">
          {message}
        </p>
      )}
      {b.props.whatsapp && (
        <a
          href={`https://wa.me/${b.props.whatsapp.replace("+", "")}`}
          target="_blank"
          rel="noreferrer"
        >
          También podés escribirnos por WhatsApp ↗
        </a>
      )}
    </section>
  );
}
function Audio({
  id,
  slug,
  volume = 0.5,
}: {
  id: string;
  slug?: string;
  volume?: number;
}) {
  const ref = useRef<HTMLAudioElement>(null),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState("");
  return (
    <div>
      <audio
        ref={ref}
        preload="none"
        src={mediaURL(id, slug)}
        onEnded={() => setPlaying(false)}
        onError={() => setError("El audio no está disponible")}
      />
      <button
        className="inv-button"
        onClick={async () => {
          try {
            if (!ref.current) return;
            ref.current.volume = volume;
            if (playing) ref.current.pause();
            else await ref.current.play();
            setPlaying(!playing);
          } catch {
            setError("No se pudo reproducir el archivo");
          }
        }}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}{" "}
        {playing ? "Pausar música" : "Escuchar música"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
function CopyAlias({ alias }: { alias: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="inv-button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(alias);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      <Copy size={15} />
      {copied ? "Copiado" : alias}
    </button>
  );
}
function SongForm({ slug }: { slug: string }) {
  const [message, setMessage] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const r = await fetch(`/api/public/${slug}/songs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: f.get("title"),
            artist: f.get("artist"),
            url: f.get("url"),
            website: f.get("website") ?? "",
          }),
        });
        const data = await r.json();
        setMessage(r.ok ? "Sugerencia guardada" : data.error);
      }}
    >
      <label>
        Canción
        <input name="title" required maxLength={120} />
      </label>
      <label>
        Artista
        <input name="artist" maxLength={120} />
      </label>
      <label>
        Enlace HTTPS (opcional)
        <input name="url" type="url" />
      </label>
      <input
        className="honeypot"
        name="website"
        tabIndex={-1}
        aria-label="Sitio web"
      />
      <button className="inv-button">Enviar sugerencia</button>
      <p role="status">{message}</p>
    </form>
  );
}
function Section({
  d,
  b,
  slug,
  guest,
}: {
  d: InvitationDocument;
  b: Block;
  slug?: string;
  guest?: string;
}) {
  const p = b.props;
  if (b.type === "hero")
    return (
      <Hero
        key={`${d.theme.videoId ?? "none"}:${Boolean(d.theme.videoAutoplay)}:${slug ?? "draft"}`}
        d={d}
        b={b}
        slug={slug}
      />
    );
  if (b.type === "rsvp") return <RSVP slug={slug} b={b} guest={guest} />;
  if (b.type === "countdown")
    return (
      <section className="inv-section count-section">
        <p className="inv-eyebrow">Cada vez falta menos</p>
        <Countdown date={d.event.startsAt} />
      </section>
    );
  if (b.type === "message")
    return p.text || d.event.message ? (
      <section className="inv-section message-section">
        <span>✦</span>
        <h2>{p.title || "Los mejores momentos se comparten"}</h2>
        <p>{p.text || d.event.message}</p>
      </section>
    ) : null;
  if (b.type === "venues")
    return p.items?.some((i) => i.name) ? (
      <section className="inv-section">
        <MapPin className="section-icon" />
        <h2>{p.title || "El lugar del encuentro"}</h2>
        <div className="venue-grid">
          {p.items
            .filter((i) => i.name)
            .map((v, i) => (
              <article key={i}>
                <span className="inv-eyebrow">{v.time}</span>
                <h3>{v.name}</h3>
                <p>{v.address}</p>
                {v.url && (
                  <a
                    className="inv-button"
                    target="_blank"
                    rel="noreferrer"
                    href={v.url}
                  >
                    Cómo llegar
                    <ArrowUpRight size={15} />
                  </a>
                )}
              </article>
            ))}
        </div>
      </section>
    ) : null;
  if (b.type === "calendar")
    return (
      <section className="inv-section">
        <CalendarDays className="section-icon" />
        <h2>{p.title || "Reservá la fecha"}</h2>
        <p>{dateLabel(d)}</p>
        <small>{d.event.timezone}</small>
        {slug ? (
          <a className="inv-button" href={`/api/public/${slug}/calendar`}>
            Agregar a mi calendario
          </a>
        ) : (
          <p className="preview-notice">Calendario disponible al publicar</p>
        )}
      </section>
    );
  if (b.type === "gallery")
    return p.photos?.length ? (
      <section className="inv-section gallery-section">
        <h2>{p.title || "Nuestra historia en imágenes"}</h2>
        <div className="inv-gallery">
          {p.photos.map((photo, i) => (
            <figure key={`${photo.mediaId}-${i}`}>
              <img
                src={mediaURL(photo.mediaId, slug)}
                alt={photo.alt}
                width="800"
                height="800"
                loading="lazy"
                style={{
                  objectPosition: `${photo.focusX ?? 50}% ${photo.focusY ?? 50}%`,
                }}
              />
              {photo.caption && <figcaption>{photo.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </section>
    ) : null;
  if (b.type === "dressCode" || b.type === "gifts")
    return p.text || p.alias || p.url ? (
      <section className="inv-section detail-section">
        {b.type === "gifts" ? (
          <Gift className="section-icon" />
        ) : (
          <Shirt className="section-icon" />
        )}
        <h2>
          {p.title ||
            (b.type === "gifts" ? "Un detalle con cariño" : "Dress code")}
        </h2>
        <p>{p.text}</p>
        {p.holder && <p>{p.holder}</p>}
        {p.alias && <CopyAlias alias={p.alias} />}{" "}
        {p.url && (
          <a
            className="inv-button"
            href={p.url}
            target="_blank"
            rel="noreferrer"
          >
            Ver más <ArrowUpRight size={15} />
          </a>
        )}
      </section>
    ) : null;
  if (b.type === "music")
    return p.audioId || p.spotify ? (
      <section className="inv-section">
        <Music className="section-icon" />
        <h2>{p.title || "La banda sonora"}</h2>
        {p.audioId && (
          <Audio id={p.audioId} slug={slug} volume={p.volume} />
        )}{" "}
        {p.spotify && (
          <a
            className="inv-button"
            href={p.spotify}
            target="_blank"
            rel="noreferrer"
          >
            Abrir en Spotify <ArrowUpRight size={15} />
          </a>
        )}
        <p className="inv-small">La música empieza cuando vos elegís.</p>
      </section>
    ) : null;
  if (b.type === "social")
    return p.url || p.hashtag ? (
      <section className="inv-section">
        <h2>{p.title || "Compartamos los recuerdos"}</h2>
        <p>{p.hashtag}</p>
        {p.url && (
          <a
            className="inv-button"
            href={p.url}
            target="_blank"
            rel="noreferrer"
          >
            Instagram ↗
          </a>
        )}
      </section>
    ) : null;
  if (b.type === "agenda")
    return p.items?.length ? (
      <section className="inv-section">
        <h2>{p.title || "Así lo vamos a vivir"}</h2>
        <ol className="inv-agenda">
          {p.items.map((a, i) => (
            <li key={i}>
              <time>{a.time}</time>
              <div>
                <h3>{a.name}</h3>
                <p>{a.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    ) : null;
  if (b.type === "songRequests")
    return (
      <section className="inv-section">
        <h2>{p.title || "¿Qué canción no puede faltar?"}</h2>
        {slug ? (
          <SongForm slug={slug} />
        ) : (
          <p className="preview-notice">
            Las sugerencias se habilitan al publicar.
          </p>
        )}
      </section>
    );
  return null;
}
export function InvitationRenderer({
  document: d,
  slug,
  guest,
  compact = false,
}: {
  document: InvitationDocument;
  slug?: string;
  guest?: string;
  compact?: boolean;
}) {
  const sample = customSamples.find((s) => s.id === d.theme.sampleStyle);
  const style = {
    "--inv-accent": d.theme.accent,
    "--inv-bg": d.theme.background,
    "--inv-fg": d.theme.foreground,
    "--inv-heading": fontStack(d.theme.headingFont),
    "--inv-body": fontStack(d.theme.bodyFont),
    "--inv-radius": `${d.theme.radius}px`,
    "--inv-scale": d.theme.scale,
    "--inv-spacing": d.theme.spacing,
    ...(sample
      ? {
          "--sample-surface": sample.surface,
          "--sample-muted": sample.muted,
          "--sample-border": sample.border,
          "--sample-decor": sample.decor,
        }
      : {}),
    textAlign: d.theme.align,
  } as CSSProperties;
  return (
    <div
      className={`invitation family-${d.theme.family} ${compact ? "compact" : ""} ${sample ? `sample-layout sample-${sample.id}` : ""}`}
      style={style}
    >
      {d.blocks
        .filter((b) => b.enabled)
        .map((b) => (
          <Section key={b.id} d={d} b={b} slug={slug} guest={guest} />
        ))}
      <footer className="inv-footer">
        <span>Hecho para compartir</span>
        <Link href="/">Pixvo.Tech · Invitaciones ↗</Link>
      </footer>
    </div>
  );
}
