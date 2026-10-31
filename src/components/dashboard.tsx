"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowUpRight,
  Copy,
  Archive,
  Users,
  Pause,
  Share2,
} from "lucide-react";
import { api } from "./auth";
import { Notice } from "./ui";
import type { Invitation } from "@/server/services";
export const statusLabels: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  paused: "Pausado",
  archived: "Archivado",
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  refunded: "Reembolsado",
  charged_back: "Contracargo",
};
export function Dashboard() {
  const router = useRouter();
  const [items, setItems] = useState<Invitation[]>([]),
    [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false);
  const load = () =>
    api<Invitation[]>("/api/invitations")
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  useEffect(() => {
    void load();
  }, []);
  async function action(i: Invitation, type: string) {
    setError("");
    try {
      if (type === "duplicate") {
        const d = await api<{ id: string }>(
          `/api/invitations/${i.id}/duplicate`,
          "POST",
          {},
        );
        router.push(`/app/invitaciones/${d.id}/editar`);
      } else {
        await api(`/api/invitations/${i.id}/status`, "POST", { status: type });
        await load();
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const filtered = items.filter(
    (i) =>
      (!status || i.status === status) &&
      i.draft_json.event.title.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <main className="workspace-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Cada encuentro, en un lugar</p>
          <h1>Mis invitaciones</h1>
          <p>Ideas en borrador. Momentos por compartir.</p>
        </div>
        <Link href="/templates" className="button primary">
          <Plus size={16} />
          Crear invitación
        </Link>
      </div>
      <div className="dashboard-toolbar">
        <input
          className="control"
          aria-label="Buscar invitación"
          placeholder="Buscar por nombre"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="control"
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {["draft", "published", "paused", "archived"].map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </div>
      {error && <Notice error>{error}</Notice>}
      {!loaded ? (
        <p>Cargando tus invitaciones…</p>
      ) : !filtered.length ? (
        <div className="panel empty-state">
          <h2>Tu próxima historia va acá.</h2>
          <p>Elegí un diseño y empezá a darle forma.</p>
          <Link className="button primary" href="/templates">
            Explorar diseños <ArrowUpRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="dashboard-grid">
          {filtered.map((i) => (
            <article className="event-card" key={i.id}>
              <div
                className="event-art"
                style={{
                  backgroundColor: i.draft_json.theme.background,
                  color: i.draft_json.theme.foreground,
                  backgroundImage: `url(/${i.draft_json.theme.backgroundAsset})`,
                }}
              >
                {i.draft_json.event.title}
              </div>
              <div className="event-body">
                <div className="event-meta">
                  <span className="status-pill">{statusLabels[i.status]}</span>
                  <span>Revisión {i.revision}</span>
                </div>
                <h2>{i.draft_json.event.title}</h2>
                <p>
                  {new Intl.DateTimeFormat("es-AR", {
                    dateStyle: "long",
                    timeZone: i.draft_json.event.timezone,
                  }).format(new Date(i.draft_json.event.startsAt))}
                </p>
                <p>
                  Último cambio:{" "}
                  {new Date(i.updated_at).toLocaleString("es-AR")}
                </p>
                <div className="event-actions">
                  <Link
                    className="button small primary"
                    href={`/app/invitaciones/${i.id}/editar`}
                  >
                    Editar <ArrowUpRight size={12} />
                  </Link>
                  <Link
                    className="button small ghost"
                    href={`/app/invitaciones/${i.id}/respuestas`}
                  >
                    <Users size={12} />
                    Respuestas
                  </Link>
                  <Link
                    className="button small ghost"
                    href={`/app/invitaciones/${i.id}/compartir`}
                  >
                    <Share2 size={12} />
                    Compartir
                  </Link>
                  <button
                    className="link-button"
                    title="Duplicar invitación"
                    onClick={() => action(i, "duplicate")}
                  >
                    <Copy size={13} />
                    Duplicar
                  </button>
                  {i.status === "published" ? (
                    <button
                      className="link-button"
                      onClick={() => action(i, "paused")}
                    >
                      <Pause size={12} />
                      Pausar
                    </button>
                  ) : i.status === "archived" ? (
                    <button
                      className="link-button"
                      onClick={() => action(i, "draft")}
                    >
                      Reactivar borrador
                    </button>
                  ) : (
                    <button
                      className="link-button"
                      onClick={() => action(i, "archived")}
                    >
                      <Archive size={12} />
                      Archivar
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
