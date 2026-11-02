"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
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
  max_attendees: number | null;
  version: number;
};
function GuestEditor({ eventId, guest, onSaved, onCancel }: { eventId: string; guest: Reply; onSaved: () => Promise<void>; onCancel: () => void }) {
  const editor = useRef<HTMLFormElement>(null);
  useEffect(() => { editor.current?.scrollIntoView({ block: "center" }); }, []);
  const [response, setResponse] = useState(guest.response ?? "pending");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <form ref={editor} className="panel form-grid" aria-label="Editar invitado" onSubmit={async e => {
    e.preventDefault(); if (busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true); setError("");
    try {
      await api(`/api/invitations/${eventId}/guests/${guest.id}`, "PATCH", { expectedVersion: guest.version, label: f.get("label"), name: f.get("name"), response, attendees: response === "yes" ? Number(f.get("attendees")) : 0, diet: f.get("diet"), message: f.get("message") });
      await onSaved();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }}>
    <h2>Editar invitado</h2>
    <label className="field">Nombre del grupo<input name="label" required maxLength={120} defaultValue={guest.label} /></label>
    <label className="field">Nombre de quien confirma<input name="name" required={response !== "pending"} maxLength={120} defaultValue={guest.name ?? guest.label} /></label>
    <label className="field">Respuesta<select value={response} onChange={e => setResponse(e.target.value)}>{!guest.response && <option value="pending">Pendiente</option>}<option value="yes">Asiste</option><option value="no">No asiste</option></select></label>
    {response === "yes" && <label className="field">Personas confirmadas<input name="attendees" type="number" min="1" max={guest.max_attendees ?? undefined} required defaultValue={guest.attendees || 1} /></label>}
    <label className="field">Restricciones alimentarias<textarea name="diet" maxLength={500} defaultValue={guest.diet ?? ""} /></label>
    <label className="field">Integrantes / mensaje<textarea name="message" maxLength={1000} defaultValue={guest.message ?? ""} /></label>
    <p>Estos cambios actualizan la lista. No envían mensajes al invitado.</p>
    {error && <Notice error>{error}</Notice>}
    <div className="inline-actions"><button className="button primary" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button><button className="button ghost" type="button" disabled={busy} onClick={onCancel}>Cancelar</button></div>
  </form>;
}
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
  const [editing, setEditing] = useState<Reply | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
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
      {editing && <GuestEditor key={editing.id + ":" + editing.version} eventId={id} guest={editing} onCancel={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); }} />}
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invitado / grupo</th>
              <th>Respuesta</th>
              <th>Personas</th>
              <th>Alimentación</th>
              <th>Mensaje</th>
              <th>Acciones</th>
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
                  {r.attendees ?? "—"}{r.max_attendees !== null ? ` / ${r.max_attendees}` : " · Sin límite"}
                </td>
                <td>{r.diet || "—"}</td>
                <td>{r.message || "—"}</td>
                <td><div className="inline-actions">
                  <button className="button small ghost" disabled={deleting !== null} onClick={() => { setError(""); setEditing(r); }}>Editar</button>
                  <button className="button small ghost" disabled={deleting !== null} onClick={async () => {
                    if (!window.confirm(`¿Eliminar a ${r.name || r.label} y su respuesta? Su enlace personal dejará de funcionar. Esta acción no se puede deshacer.`)) return;
                    setDeleting(r.id); setError("");
                    try { await api(`/api/invitations/${id}/guests/${r.id}`, "DELETE", { expectedVersion: r.version }); if (editing?.id === r.id) setEditing(null); await load(); }
                    catch (e) { setError((e as Error).message); }
                    finally { setDeleting(null); }
                  }}>{deleting === r.id ? "Eliminando…" : "Eliminar"}</button>
                </div></td>
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
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
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
          {i.entitlement ? <>
            <span>El pago está registrado. Publicá la versión guardada para obtener el enlace que podrás compartir. </span>
            <button className="button primary" disabled={publishing} onClick={async () => {
              setPublishing(true); setError("");
              try { await api(`/api/invitations/${i.id}/publish`, "POST", { expectedRevision: i.revision }); router.refresh(); }
              catch (e) { setError((e as Error).message); }
              finally { setPublishing(false); }
            }}>{publishing ? "Publicando…" : "Publicar y compartir"}</button>
          </> : "La invitación todavía no está activa. Registrá el pago para habilitar su publicación."}
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
