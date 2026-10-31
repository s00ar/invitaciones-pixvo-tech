"use client";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Copy, Download, Plus, Check, ArrowUpRight } from "lucide-react";
import { api } from "./auth";
import { Notice } from "./ui";
import type { Invitation } from "@/server/services";
import { statusLabels } from "./dashboard";
type Reply = {
  id: string;
  label: string;
  name: string | null;
  response: string | null;
  attendees: number | null;
  diet: string | null;
  message: string | null;
  max_attendees: number;
};
export function EventNav({ id }: { id: string }) {
  return (
    <nav className="app-subnav">
      <Link href={`/app/invitaciones/${id}/editar`}>Editor</Link>
      <Link href={`/app/invitaciones/${id}/respuestas`}>
        Respuestas e invitados
      </Link>
      <Link href={`/app/invitaciones/${id}/compartir`}>Compartir</Link>
    </nav>
  );
}
export function Responses({ id }: { id: string }) {
  const [rows, setRows] = useState<Reply[]>([]),
    [songs, setSongs] = useState<
      { title: string; artist: string; url: string }[]
    >([]),
    [error, setError] = useState(""),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState(""),
    [invite, setInvite] = useState(""),
    [copied, setCopied] = useState(false);
  const load = useCallback(
    () =>
      api<Reply[]>(`/api/invitations/${id}/rsvps`)
        .then(setRows)
        .catch((e) => setError(e.message)),
    [id],
  );
  useEffect(() => {
    void load();
    api<{ title: string; artist: string; url: string }[]>(
      `/api/invitations/${id}/songs`,
    )
      .then(setSongs)
      .catch((e) => setError(e.message));
  }, [id, load]);
  const filtered = rows.filter(
    (r) =>
      (!filter || (r.response ?? "pending") === filter) &&
      `${r.label} ${r.name ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <main className="workspace-content">
      <EventNav id={id} />
      <div className="page-heading">
        <div>
          <p className="eyebrow">Tu gente, cada vez más cerca</p>
          <h1>Respuestas e invitados</h1>
        </div>
        <a
          className="button ghost"
          href={`/api/invitations/${id}/export.csv?response=${filter}&q=${encodeURIComponent(q)}`}
        >
          <Download size={14} />
          Exportar CSV
        </a>
      </div>
      {error && <Notice error>{error}</Notice>}
      <div className="stats">
        <div className="stat">
          <strong>
            {rows
              .filter((r) => r.response === "yes")
              .reduce((n, r) => n + (r.attendees ?? 0), 0)}
          </strong>
          <span>Personas confirmadas</span>
        </div>
        <div className="stat">
          <strong>{rows.filter((r) => r.response === "no").length}</strong>
          <span>No asisten</span>
        </div>
        <div className="stat">
          <strong>{rows.filter((r) => !r.response).length}</strong>
          <span>Grupos pendientes</span>
        </div>
      </div>
      <div className="panel">
        <h2>Un enlace para cada grupo</h2>
        <p>
          El cupo se verifica en el servidor. Guardá el enlace al crearlo; por
          privacidad, no se puede recuperar su token.
        </p>
        <form
          className="two-col"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              const result = await api<{ slug: string; token: string }>(
                `/api/invitations/${id}/guests`,
                "POST",
                { label: f.get("label"), maxAttendees: Number(f.get("max")) },
              );
              setInvite(
                `${location.origin}/i/${result.slug}?guest=${result.token}`,
              );
              setCopied(false);
              await load();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <label className="field">
            Nombre del grupo
            <input name="label" required maxLength={120} />
          </label>
          <label className="field">
            Cupo total
            <input
              type="number"
              name="max"
              required
              min="1"
              max="20"
              defaultValue="2"
            />
          </label>
          <button className="button primary">
            <Plus size={14} />
            Crear enlace personal
          </button>
        </form>
        {invite && (
          <div style={{ marginTop: 20 }}>
            <p className="share-url">{invite}</p>
            <button
              className="button small ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(invite);
                  setCopied(true);
                } catch {
                  setError(
                    "No se pudo copiar. Seleccioná el enlace manualmente.",
                  );
                }
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}{" "}
              {copied ? "Copiado" : "Copiar enlace"}
            </button>
          </div>
        )}
      </div>
      <div className="dashboard-toolbar">
        <input
          className="control"
          placeholder="Buscar invitado"
          aria-label="Buscar invitado"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="control"
          aria-label="Filtrar respuesta"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">Todas las respuestas</option>
          <option value="yes">Asisten</option>
          <option value="no">No asisten</option>
          <option value="pending">Pendientes</option>
        </select>
        <button className="button small ghost" onClick={load}>
          Actualizar
        </button>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invitado / grupo</th>
              <th>Respuesta</th>
              <th>Personas</th>
              <th>Alimentación</th>
              <th>Mensaje</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.name || r.label}
                  {r.name && <small>{r.label}</small>}
                </td>
                <td>
                  {r.response === "yes"
                    ? "Asiste"
                    : r.response === "no"
                      ? "No asiste"
                      : "Pendiente"}
                </td>
                <td>
                  {r.attendees ?? "—"} / {r.max_attendees}
                </td>
                <td>{r.diet || "—"}</td>
                <td>{r.message || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <p style={{ padding: 25 }}>
            Todavía no hay respuestas para estos filtros.
          </p>
        )}
      </div>
      {songs.length > 0 && (
        <section className="panel">
          <h2>Canciones sugeridas</h2>
          <ul>
            {songs.map((s, i) => (
              <li key={i}>
                {s.title} — {s.artist}{" "}
                {s.url && (
                  <a href={s.url} rel="noreferrer" target="_blank">
                    Escuchar ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
export function Share({
  invitation: i,
  qr,
  url,
}: {
  invitation: Invitation;
  qr: string | null;
  url: string;
}) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="workspace-content">
      <EventNav id={i.id} />
      <div className="page-heading">
        <div>
          <p className="eyebrow">La emoción se comparte</p>
          <h1>Invitá a tu gente.</h1>
          <p>
            {i.draft_json.event.title} · {statusLabels[i.status]}
          </p>
        </div>
      </div>
      {i.status !== "published" ? (
        <Notice>
          La invitación todavía no está activa. Revisá el pago y publicala desde
          el editor.
        </Notice>
      ) : (
        <div className="panel qr-panel">
          {qr ? (
            <img
              src={qr}
              width="220"
              height="220"
              alt="Código QR de la invitación publicada"
            />
          ) : (
            <div className="notice">
              El código QR requiere un plan que lo incluya.
            </div>
          )}
          <div>
            <h2>Todo empieza con este enlace.</h2>
            <p className="share-url">{url}</p>
            <div className="inline-actions">
              <button
                className="button primary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                  } catch {
                    setError(
                      "No se pudo copiar. Seleccioná el enlace manualmente.",
                    );
                  }
                }}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
                {copied ? "Copiado" : "Copiar enlace"}
              </button>
              <a
                href={url}
                className="button ghost"
                target="_blank"
                rel="noreferrer"
              >
                Abrir invitación <ArrowUpRight size={15} />
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Te esperamos: ${url}`)}`}
                className="button ghost"
                rel="noreferrer"
                target="_blank"
              >
                WhatsApp ↗
              </a>
              {qr && (
                <a
                  className="button ghost"
                  download="pixvo-invitacion-qr.png"
                  href={qr}
                >
                  <Download size={14} />
                  Descargar QR
                </a>
              )}
            </div>
            <p style={{ fontSize: 11, marginTop: 20 }}>
              El enlace abierto puede reenviarse. Si elegiste confirmaciones
              privadas, compartí los enlaces personales desde Invitados.
            </p>
          </div>
        </div>
      )}
      {error && <Notice error>{error}</Notice>}
    </main>
  );
}
