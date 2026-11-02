"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Music2,
  Pause,
  Play,
  Gift,
  Check,
  ArrowDown,
  Sparkles,
} from "lucide-react";
import type { InvitationDocument } from "@/domain/document";
import { googleCalendarUrl } from "@/domain/format";

import "./azul-invitation.css";

export function AzulInvitation({
  document: d,
  slug,
  audioUrl,
}: {
  document: InvitationDocument;
  slug?: string;
  audioUrl?: string;
}) {
  const name = d.event.hosts[0] || d.event.title;
  const venue = d.blocks.find((b) => b.type === "venues")?.props.items?.[0];
  const alias = d.blocks.find((b) => b.type === "gifts")?.props.alias || "";
  const cutoff = d.blocks.find((b) => b.type === "rsvp")?.props.closesAt;
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: d.event.timezone,
    day: "2-digit",
    month: "long",
    year: "numeric",
    weekday: "long",
  }).formatToParts(new Date(d.event.startsAt));
  const part = (type: string) =>
    parts.find((p) => p.type === type)?.value || "";
  const numericDate = new Intl.DateTimeFormat("es-AR", {
    timeZone: d.event.timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date(d.event.startsAt))
    .replaceAll("/", " · ");
  const hour = (date: string) =>
    new Intl.DateTimeFormat("es-AR", {
      timeZone: d.event.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(date));
  const endDate = d.event.endsAt
    ? new Intl.DateTimeFormat("es-AR", {
        timeZone: d.event.timezone,
        day: "numeric",
        month: "long",
      }).format(new Date(d.event.endsAt))
    : "";
  const closesLabel = cutoff
    ? new Intl.DateTimeFormat("es-AR", {
        timeZone: d.event.timezone,
        day: "numeric",
        month: "long",
      }).format(new Date(Date.parse(cutoff) - 1))
    : "la fecha indicada";
  const [opened, setOpened] = useState(false),
    [playing, setPlaying] = useState(false),
    [audioError, setAudioError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null),
    [copied, setCopied] = useState(false);
  const audio = useRef<HTMLAudioElement>(null),
    content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tick = () =>
      setRemaining(Math.max(0, Date.parse(d.event.startsAt) - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [d.event.startsAt]);
  async function play() {
    try {
      await audio.current?.play();
      setAudioError("");
    } catch {
      setAudioError("Tocá el botón de música para reintentar.");
    }
  }
  const values =
    remaining === null
      ? ["—", "—", "—", "—"]
      : [
          Math.floor(remaining / 86400000),
          Math.floor(remaining / 3600000) % 24,
          Math.floor(remaining / 60000) % 60,
          Math.floor(remaining / 1000) % 60,
        ];
  return (
    <main className="azul-page">
      {!slug && (
        <div className="azul-preview">
          VISTA PREVIA PRIVADA{" "}
          <span>Las respuestas y los envíos aún no están habilitados.</span>
        </div>
      )}
      {audioUrl && (
        <audio
          ref={audio}
          src={audioUrl}
          preload="none"
          loop
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => {
            setPlaying(false);
            setAudioError(
              "No se pudo cargar la música. Podés continuar leyendo la invitación.",
            );
          }}
        />
      )}
      <header className={`azul-opening ${opened ? "is-open" : ""}`}>
        <div className="azul-opening-intro">
          <p className="azul-kicker">UNA NOCHE PARA RECORDAR</p>
          <span className="azul-script">Estás invitado</span>
          <p>Hay un momento especial esperando por vos.</p>
        </div>
        <div className="azul-envelope">
          <div className="azul-envelope-card">
            <span className="azul-crown" aria-hidden="true">
              ♕
            </span>
            <span className="azul-script">{name}</span>
            <span className="azul-kicker">MIS QUINCE AÑOS</span>
            <span>{numericDate}</span>
          </div>
          <div className="azul-envelope-fold" aria-hidden="true">
            <div className="azul-envelope-lettering">
              <span className="azul-kicker">MIS XV</span>
              <span className="azul-script">{name}</span>
              <span className="azul-envelope-date">{numericDate}</span>
            </div>
          </div>
          <div className="azul-envelope-cord" aria-hidden="true" />
          <button
            className="azul-seal"
            aria-label={`Abrir invitación de ${name}`}
            aria-expanded={opened}
            aria-controls="azul-content"
            onClick={() => {
              setOpened(true);
              if (audioUrl) void play();
              setTimeout(
                () =>
                  content.current?.scrollIntoView({
                    behavior: window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches
                      ? "instant"
                      : "smooth",
                  }),
                450,
              );
            }}
          >
            {name.slice(0, 1)}
          </button>
        </div>
        <p className="azul-open-hint">
          {opened
            ? "Tu lugar en esta historia es especial"
            : "Tocá el sello para abrir la invitación"}
        </p>
        <span className="azul-fine">CON MUCHO AMOR, {name.toUpperCase()}</span>
      </header>
      <div ref={content} id="azul-content" hidden={!opened}>
        <nav className="azul-nav" aria-label="Secciones de la invitación">
          <span className="azul-script">{name}</span>
          <a href="#azul-lugar">La fiesta</a>
          <a href="#azul-rsvp">Confirmar</a>
          {audioUrl && (
            <button
              onClick={() => {
                if (playing) audio.current?.pause();
                else void play();
              }}
              aria-label={playing ? "Pausar música" : "Reproducir música"}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
          )}
        </nav>
        {audioError && (
          <p className="azul-audio-error" role="status">
            {audioError}
          </p>
        )}
        <section className="azul-hero">
          <div className="azul-glass">
            <div className="azul-glass-inner">
              <span className="azul-crown" aria-hidden="true">
                ♕
              </span>
              <p className="azul-kicker">MIS QUINCE AÑOS</p>
              <h1 className="azul-script">{name}</h1>
              <p className="azul-quote">{d.event.message}</p>
              <div className="azul-date">
                <span>{part("weekday").toUpperCase()}</span>
                <strong>{part("day")}</strong>
                <span>
                  {part("month").toUpperCase()}
                  <br />
                  {part("year")}
                </span>
              </div>
              <p className="azul-time">
                De {hour(d.event.startsAt)}
                {d.event.endsAt ? ` a ${hour(d.event.endsAt)}` : ""} hs
              </p>
              <span className="azul-flourish" aria-hidden="true">
                ❧
              </span>
              <a
                className="azul-down"
                href="#azul-countdown"
                aria-label="Ver los detalles"
              >
                <ArrowDown size={18} />
              </a>
            </div>
          </div>
        </section>
        <section className="azul-section azul-count" id="azul-countdown">
          <p className="azul-kicker">EL COMIENZO DE UN RECUERDO</p>
          <h2>Falta muy poquito</h2>
          <div className="azul-counter">
            {values.map((v, i) => (
              <div key={i}>
                <strong>{String(v).padStart(2, "0")}</strong>
                <span>{["DÍAS", "HORAS", "MINUTOS", "SEGUNDOS"][i]}</span>
              </div>
            ))}
          </div>
          <a className="azul-button azul-outline" href={googleCalendarUrl(d)} target="_blank" rel="noopener noreferrer" aria-label="Agendar este día en Google Calendar">
            <CalendarDays size={16} /> Agendar este día
          </a>
        </section>
        <section className="azul-section azul-venue" id="azul-lugar">
          <div className="azul-venue-art" aria-hidden="true">
            <span>Una noche,</span>
            <span className="azul-script">mil recuerdos</span>
          </div>
          <div>
            <MapPin size={25} strokeWidth={1} />
            <p className="azul-kicker">NOS ENCONTRAMOS EN</p>
            <h2>{venue?.name}</h2>
            <p>{venue?.address}</p>
            <p className="azul-time">
              {part("day")} de {part("month")} · {hour(d.event.startsAt)} hs
              <br />
              <small>
                {d.event.endsAt
                  ? `Hasta las ${hour(d.event.endsAt)} hs del ${endDate}`
                  : ""}
              </small>
            </p>
            <a
              className="azul-button"
              href={venue?.url}
              target="_blank"
              rel="noreferrer"
            >
              Cómo llegar <MapPin size={15} />
            </a>
          </div>
        </section>
        <section className="azul-section azul-dress">
          <Sparkles size={26} strokeWidth={1} />
          <p className="azul-kicker">EL LOOK DE LA NOCHE</p>
          <h2>Elegante sport</h2>
          <p>Vení con ganas de celebrar y sentirte especial.</p>
          <div className="azul-dress-note">
            <span className="azul-fine">UN DETALLE IMPORTANTE</span>
            <p>
              No se permiten prendas de color{" "}
              <strong>rosa, blanco o plateado</strong>, ni prendas con{" "}
              <strong>brillos</strong>.
            </p>
            <span>Gracias por acompañarme también en este detalle.</span>
          </div>
        </section>
        <section className="azul-section azul-rsvp" id="azul-rsvp">
          <p className="azul-kicker">MI NOCHE ES MÁS LINDA CON VOS</p>
          <h2>¿Me acompañás?</h2>
          <p>
            Confirmá tu asistencia hasta el{" "}
            <strong>{closesLabel} inclusive.</strong>
          </p>
          <p className="azul-fine">PODÉS CONFIRMAR A TODO TU GRUPO FAMILIAR</p>
          <AzulRSVP slug={slug} />
        </section>
        <section className="azul-section azul-extras">
          <div>
            <Music2 size={25} strokeWidth={1} />
            <p className="azul-kicker">LA BANDA SONORA DE MIS XV</p>
            <h2>Que no falte tu canción</h2>
            <p>
              ¿Cuál te hace salir a bailar?
              <br />
              Ayudame a armar una noche inolvidable.
            </p>
            <SongRequest slug={slug} />
          </div>
          <div>
            <Gift size={25} strokeWidth={1} />
            <p className="azul-kicker">UN GESTO CON AMOR</p>
            <h2>El mejor regalo es verte</h2>
            <p>
              Tu presencia es lo más importante.
              <br />
              Si además querés hacerme un regalo, te dejo mi alias.
            </p>
            <div className="azul-alias">
              <span className="azul-fine">ALIAS</span>
              <strong>{alias}</strong>
              <button
                className="azul-button azul-outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(alias);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? (
                  <>
                    <Check size={15} /> Alias copiado
                  </>
                ) : (
                  "Copiar alias"
                )}
              </button>
            </div>
          </div>
        </section>
        <footer className="azul-footer">
          <span className="azul-flourish" aria-hidden="true">
            ❧
          </span>
          <p>Gracias por ser parte de mi historia.</p>
          <span className="azul-script">Te espero, {name}</span>
          <p className="azul-fine">{numericDate}</p>
          <Link href="/">
            Una invitación exclusiva de <strong>Pixvo</strong>
          </Link>
        </footer>
      </div>
    </main>
  );
}

function AzulRSVP({ slug }: { slug?: string }) {
  const [attendees, setAttendees] = useState(1);
  const [response, setResponse] = useState("yes"),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(""),
    [error, setError] = useState(false);
  const receipt = useRef<string | null>(null);
  useEffect(() => {
    try {
      receipt.current = slug
        ? localStorage.getItem(`pixvo-rsvp:${slug}`)
        : null;
    } catch {}
  }, [slug]);
  return (
    <form
      className="azul-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!slug || busy) return;
        setBusy(true);
        setFeedback("");
        const f = new FormData(e.currentTarget);
        try {
          const r = await fetch(`/api/public/${slug}/rsvp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: f.get("name"),
              response,
              attendees: response === "yes" ? Number(f.get("attendees")) : 0,
              diet: f.get("diet") ?? "",
              message: f.get("members") ?? "",
              website: f.get("website") ?? "",
              ...(receipt.current ? { token: receipt.current } : {}),
            }),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          receipt.current = data.token;
          try {
            localStorage.setItem(`pixvo-rsvp:${slug}`, data.token);
          } catch {}
          setError(false);
          setFeedback(data.message);
          if (data.whatsappUrl) {
            setFeedback(`${data.message} Abriendo WhatsApp: tocá Enviar para avisarle a Vero.`);
            window.location.assign(data.whatsappUrl);
          }
        } catch (e) {
          setError(true);
          setFeedback(
            e instanceof Error ? e.message : "No se pudo guardar. Reintentá.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Nombre y apellido de quien confirma
        <input
          name="name"
          autoComplete="name"
          maxLength={120}
          required
          placeholder="Tu nombre y apellido"
        />
      </label>
      <fieldset>
        <legend>¿Vas a acompañarme?</legend>
        <label>
          <input
            type="radio"
            name="attendance"
            checked={response === "yes"}
            onChange={() => setResponse("yes")}
          />{" "}
          ¡Sí, voy a estar!
        </label>
        <label>
          <input
            type="radio"
            name="attendance"
            checked={response === "no"}
            onChange={() => setResponse("no")}
          />{" "}
          No podré asistir
        </label>
      </fieldset>
      {response === "yes" && (
        <>
          <label>
            Personas del grupo, incluyéndote
            <input
              name="attendees"
              type="number"
              min="1"
              step="1"
              value={attendees}
              onChange={(e) => setAttendees(Number(e.target.value))}
              required
            />
          </label>
          <label>
            Nombres y apellidos de los integrantes {attendees === 1 && <span>(opcional si vas solo)</span>}
            <textarea
              name="members"
              rows={3}
              maxLength={1000}
              required={attendees > 1}
              placeholder="Incluí a todas las personas que asistirán."
            />
          </label>
          <label>
            Restricciones alimentarias <span>(opcional)</span>
            <textarea
              name="diet"
              rows={2}
              maxLength={500}
              placeholder="Indicá el nombre de la persona y lo que debemos tener en cuenta."
            />
          </label>
        </>
      )}
      <input
        className="honeypot"
        name="website"
        aria-label="Sitio web"
        tabIndex={-1}
        autoComplete="off"
      />
      <button className="azul-button" disabled={!slug || busy}>
        {busy
          ? "Guardando…"
          : slug
            ? "Confirmar respuesta"
            : "Confirmación disponible al publicar"}
      </button>
      <small>
        Los datos serán utilizados por la organización para preparar la fiesta.
      </small>
      {!slug && (
        <p className="azul-preview-note">
          Podés explorar el formulario. Esta vista previa no guarda respuestas
          ni envía mensajes.
        </p>
      )}
      {feedback && <p role={error ? "alert" : "status"}>{feedback}</p>}
    </form>
  );
}
function SongRequest({ slug }: { slug?: string }) {
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="azul-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!slug || busy) return;
        setBusy(true);
        const f = new FormData(e.currentTarget);
        try {
          const r = await fetch(`/api/public/${slug}/songs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: f.get("title"),
              artist: f.get("artist"),
              url: "",
              website: "",
            }),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          setStatus("¡Gracias! Tu canción quedó guardada.");
        } catch (e) {
          setStatus(e instanceof Error ? e.message : "No se pudo guardar.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Canción
        <input
          name="title"
          required
          maxLength={120}
          placeholder="Esa que no puede faltar"
        />
      </label>
      <label>
        Artista
        <input name="artist" maxLength={120} placeholder="¿Quién la canta?" />
      </label>
      <button className="azul-button azul-outline" disabled={!slug || busy}>
        {busy ? "Guardando…" : "Proponer canción"}
      </button>
      {!slug && <small>Las sugerencias se habilitan al publicar.</small>}
      <p role="status">{status}</p>
    </form>
  );
}
