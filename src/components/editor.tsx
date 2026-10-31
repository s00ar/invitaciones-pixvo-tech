"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Monitor,
  Smartphone,
  Eye,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Settings2,
  Palette,
  Folder,
  Layers,
} from "lucide-react";
import {
  documentSchema,
  blockLabels,
  repeatable,
  validatePlan,
  type InvitationDocument,
} from "@/domain/document";
import type { Invitation, Plan } from "@/server/services";
import { InvitationRenderer } from "./invitation";
import { EditorInspector } from "./editor-inspector";
import { api } from "./auth";
import { Notice } from "./ui";
type Version = {
  id: string;
  number: number;
  document_json: InvitationDocument;
};
export function Editor({
  initial,
  plans,
  versions,
}: {
  initial: Invitation;
  plans: Plan[];
  versions: Version[];
}) {
  const router = useRouter();
  const [d, setD] = useState(initial.draft_json),
    [revision, setRevision] = useState(initial.revision),
    [status, setStatus] = useState("Guardado"),
    [error, setError] = useState(""),
    [selected, setSelected] = useState("event"),
    [tab, setTab] = useState("canvas"),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState(false),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [hasConflict, setHasConflict] = useState(false),
    [pulse, setPulse] = useState(0),
    [recovery, setRecovery] = useState<{
      document: InvitationDocument;
      revision: number;
    } | null>(null),
    [history, setHistory] = useState<InvitationDocument[]>([]),
    [future, setFuture] = useState<InvitationDocument[]>([]),
    [planId, setPlanId] = useState(initial.entitlement?.tier ?? "standard");
  const saved = useRef(JSON.stringify(initial.draft_json)),
    doc = useRef(d),
    rev = useRef(initial.revision),
    flight = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        setModal(false);
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex="0"]',
        ) ?? [],
      ).filter((n) => n.getClientRects().length > 0);
      const first = nodes[0],
        last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [modal, busy]);
  useEffect(() => {
    doc.current = d;
  }, [d]);
  const key = `pixvo-draft:${initial.id}`;
  const change = useCallback(
    (f: (d: InvitationDocument) => InvitationDocument) => {
      const current = doc.current,
        next = f(structuredClone(current));
      doc.current = next;
      setHistory((h) => [...h, current].slice(-50));
      setFuture([]);
      setStatus("Cambios pendientes");
      setD(next);
    },
    [],
  );
  useEffect(() => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const v = JSON.parse(cached);
        if (
          documentSchema.safeParse(v.document).success &&
          JSON.stringify(v.document) !== saved.current
        )
          queueMicrotask(() => setRecovery(v));
      }
    } catch {
      /* Ignore corrupted recovery, never replace the server draft. */
    }
  }, [key]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(doc.current) !== saved.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  useEffect(() => {
    if (JSON.stringify(d) === saved.current) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ document: d, revision: rev.current }),
      );
    } catch {
      queueMicrotask(() =>
        setError(
          "No se pudo guardar la recuperación local. Mantené abierta esta pestaña hasta confirmar el guardado.",
        ),
      );
    }
    if (hasConflict) return;
    queueMicrotask(() => setStatus("Cambios pendientes"));
    const timer = setTimeout(async () => {
      if (flight.current) return;
      const snapshot = doc.current,
        parsed = documentSchema.safeParse(snapshot);
      if (!parsed.success) {
        setStatus("Revisá los datos");
        setError(
          parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join(" · "),
        );
        return;
      }
      flight.current = true;
      setStatus("Guardando…");
      try {
        const result = await api<{ revision: number }>(
          `/api/invitations/${initial.id}`,
          "PATCH",
          { document: snapshot, expectedRevision: rev.current },
        );
        rev.current = result.revision;
        setRevision(result.revision);
        saved.current = JSON.stringify(snapshot);
        setStatus("Guardado");
        setError("");
        if (JSON.stringify(doc.current) === saved.current) {
          try {
            localStorage.removeItem(key);
          } catch {
            /* The server save already succeeded. */
          }
        } else setPulse((n) => n + 1);
      } catch (e) {
        const err = e as Error & { status?: number };
        setStatus(navigator.onLine ? "Error al guardar" : "Sin conexión");
        setError(err.message);
        if (err.status === 409) setHasConflict(true);
      } finally {
        flight.current = false;
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [d, initial.id, key, pulse, hasConflict]);
  // Retry only on a new edit, explicit retry, or reconnection. Avoid polling a failed server.
  useEffect(() => {
    const online = () => {
      if (!hasConflict) setPulse((n) => n + 1);
    };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [hasConflict]);
  const undo = () => {
    if (!history.length) return;
    setStatus("Cambios pendientes");
    setFuture((f) => [d, ...f]);
    setD(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  };
  const redo = () => {
    if (!future.length) return;
    setStatus("Cambios pendientes");
    setHistory((h) => [...h, d].slice(-50));
    setD(future[0]);
    setFuture((f) => f.slice(1));
  };
  const move = (id: string, dir: number) =>
    change((d) => {
      const i = d.blocks.findIndex((b) => b.id === id),
        n = i + dir;
      if (n >= 0 && n < d.blocks.length)
        [d.blocks[i], d.blocks[n]] = [d.blocks[n], d.blocks[i]];
      return d;
    });
  const b = d.blocks.find((b) => b.id === selected),
    published = versions.find((v) => v.id === initial.published_version_id);
  async function publish() {
    setBusy(true);
    setError("");
    try {
      if (JSON.stringify(d) !== saved.current)
        throw new Error("Esperá a que termine el guardado");
      if (initial.entitlement)
        validatePlan(documentSchema.parse(d), initial.entitlement);
      const r = await api<{ slug: string }>(
        `/api/invitations/${initial.id}/publish`,
        "POST",
        { expectedRevision: rev.current },
      );
      router.push(
        `/app/invitaciones/${initial.id}/compartir?published=${encodeURIComponent(r.slug)}`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    setBusy(true);
    setError("");
    try {
      const o = await api<{ id: string }>("/api/orders", "POST", {
        eventId: initial.id,
        planId,
      });
      const c = await api<{ url: string }>(
        `/api/orders/${o.id}/checkout`,
        "POST",
        {},
      );
      window.location.assign(c.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="editor-shell">
      <header className="editor-toolbar">
        <div className="editor-title">
          <Link href="/app" aria-label="Volver a mis invitaciones">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <strong>{d.event.title}</strong>
            <small aria-live="polite">
              {status} · revisión {revision}
            </small>
          </div>
        </div>
        <div className="editor-tools">
          <button
            className="icon-button"
            title="Deshacer"
            aria-label="Deshacer"
            disabled={!history.length}
            onClick={undo}
          >
            <Undo2 size={15} />
          </button>
          <button
            className="icon-button"
            title="Rehacer"
            aria-label="Rehacer"
            disabled={!future.length}
            onClick={redo}
          >
            <Redo2 size={15} />
          </button>
          <button
            className={`icon-button desktop-control ${!mobile ? "selected" : ""}`}
            aria-label="Vista desktop"
            onClick={() => setMobile(false)}
          >
            <Monitor size={15} />
          </button>
          <button
            className={`icon-button desktop-control ${mobile ? "selected" : ""}`}
            aria-label="Vista móvil"
            onClick={() => setMobile(true)}
          >
            <Smartphone size={15} />
          </button>
          <button
            className="button small ghost"
            onClick={() => {
              setPreview(true);
              setModal(true);
            }}
          >
            <Eye size={14} />
            Preview
          </button>
          <button
            className="button small primary"
            onClick={() => {
              setPreview(false);
              setModal(true);
            }}
          >
            Revisar y publicar ↗
          </button>
        </div>
      </header>
      {recovery && (
        <div className="restore-alert">
          <span>
            Hay cambios recuperables de este dispositivo
            {recovery.revision !== revision
              ? " basados en una revisión anterior. Revisalos antes de guardarlos."
              : "."}
          </span>
          <button
            className="button ghost"
            onClick={() => {
              change(() => recovery.document);
              setRecovery(null);
            }}
          >
            Recuperar borrador
          </button>
          <button
            className="link-button"
            onClick={() => {
              setRecovery(null);
              localStorage.removeItem(key);
            }}
          >
            Descartar recuperación
          </button>
        </div>
      )}
      {error && !modal && (
        <div className="restore-alert" role="alert">
          <span>{error}</span>
          {hasConflict ? (
            <>
              <button
                className="button ghost"
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(d, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "pixvo-borrador.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Descargar mis cambios
              </button>
              <button
                className="button ghost"
                onClick={() => window.location.reload()}
              >
                Cargar versión del servidor
              </button>
            </>
          ) : (
            <button
              className="button ghost"
              onClick={() => setPulse((n) => n + 1)}
            >
              Reintentar
            </button>
          )}
        </div>
      )}
      <div className="editor-mobile-tabs">
        {[
          ["blocks", "Bloques"],
          ["canvas", "Vista"],
          ["inspector", "Editar"],
        ].map(([v, l]) => (
          <button
            key={v}
            className={tab === v ? "active" : ""}
            onClick={() => setTab(v)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="editor-layout" data-tab={tab}>
        <aside className="blocks-panel">
          <p>Tu invitación</p>
          {[
            ["event", "Datos del evento", Settings2],
            ["theme", "Estilo y diseño", Palette],
            ["media", "Archivos", Folder],
          ].map(([id, label, Icon]) => (
            <div
              key={String(id)}
              className={`block-nav-item ${selected === id ? "selected" : ""}`}
            >
              <button
                onClick={() => {
                  setSelected(String(id));
                  setTab("inspector");
                }}
              >
                {typeof Icon !== "string" && <Icon size={13} />} {String(label)}
              </button>
            </div>
          ))}
          <hr className="inspector-divider" />
          <p>Bloques</p>
          {d.blocks.map((b, i) => (
            <div
              key={b.id}
              className={`block-nav-item ${selected === b.id ? "selected" : ""} ${!b.enabled ? "disabled" : ""}`}
            >
              <button
                onClick={() => {
                  setSelected(b.id);
                  setTab("inspector");
                }}
              >
                <Layers size={12} />
                {blockLabels[b.type]}
              </button>
              <div className="block-order">
                <button
                  aria-label={`Subir ${blockLabels[b.type]}`}
                  disabled={i === 0}
                  onClick={() => move(b.id, -1)}
                >
                  <ArrowUp size={11} />
                </button>
                <button
                  aria-label={`Bajar ${blockLabels[b.type]}`}
                  disabled={i === d.blocks.length - 1}
                  onClick={() => move(b.id, 1)}
                >
                  <ArrowDown size={11} />
                </button>
              </div>
            </div>
          ))}
          {b && repeatable.includes(b.type) && (
            <div className="form-grid">
              <button
                className="button small ghost"
                onClick={() =>
                  change((d) => ({
                    ...d,
                    blocks: [
                      ...d.blocks,
                      { ...structuredClone(b), id: crypto.randomUUID() },
                    ],
                  }))
                }
              >
                <Copy size={12} />
                Duplicar bloque
              </button>
              <button
                className="link-button"
                onClick={() => {
                  change((d) => ({
                    ...d,
                    blocks: d.blocks.filter((x) => x.id !== b.id),
                  }));
                  setSelected("event");
                }}
              >
                <Trash2 size={12} />
                Eliminar bloque
              </button>
            </div>
          )}
        </aside>
        <section className="editor-canvas">
          <div className="canvas-label">
            {mobile ? "390 px · móvil" : "Vista del diseño"} · las acciones
            públicas están deshabilitadas
          </div>
          <div className={`canvas-frame ${mobile ? "mobile" : ""}`}>
            <InvitationRenderer document={d} compact />
          </div>
        </section>
        <EditorInspector
          id={initial.id}
          d={d}
          selected={selected}
          change={change}
        />
      </div>
      {modal && (
        <div
          className="modal-backdrop"
          role="dialog"
          ref={dialogRef}
          aria-modal="true"
          aria-label={preview ? "Vista previa" : "Revisar y publicar"}
        >
          <div className="modal">
            <div className="modal-top">
              <h2>
                {preview
                  ? "Tu invitación, en detalle."
                  : "Todo listo para compartir."}
              </h2>
              <button
                className="button small ghost"
                autoFocus
                onClick={() => setModal(false)}
              >
                Cerrar
              </button>
            </div>
            {error && <Notice error>{error}</Notice>}
            <div
              className="compare-grid"
              style={preview ? { gridTemplateColumns: "1fr" } : undefined}
            >
              {!preview && (
                <div>
                  <h3>
                    Publicación actual
                    {!published ? " · todavía no hay una" : ""}
                  </h3>
                  {published ? (
                    <InvitationRenderer
                      document={published.document_json}
                      compact
                    />
                  ) : (
                    <p className="notice">
                      El borrador es privado hasta que publiques con un pago
                      verificado.
                    </p>
                  )}
                </div>
              )}
              <div>
                <h3>
                  {preview
                    ? "Vista previa privada"
                    : "Borrador que vas a publicar"}
                </h3>
                <InvitationRenderer document={d} compact />
              </div>
            </div>
            {!preview && (
              <>
                <div className="modal-footer">
                  <p className="notice">
                    {initial.entitlement
                      ? `Republicaciones utilizadas: ${initial.republications} de ${initial.entitlement.republications}. Los autosaves no consumen ediciones.`
                      : "Primero elegí el plan y completá el pago. El servidor debe verificarlo antes de publicar."}
                  </p>
                </div>
                <div className="modal-footer">
                  {initial.entitlement ? (
                    <button
                      className="button primary"
                      disabled={busy || status !== "Guardado"}
                      onClick={publish}
                    >
                      {busy ? "Publicando…" : "Publicar esta versión"}
                    </button>
                  ) : (
                    <>
                      <label className="field">
                        Plan
                        <select
                          value={planId}
                          onChange={(e) =>
                            setPlanId(
                              e.target.value as
                                "standard" | "premium" | "custom",
                            )
                          }
                        >
                          {plans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ·{" "}
                              {p.price_minor
                                ? new Intl.NumberFormat("es-AR", {
                                    style: "currency",
                                    currency: p.currency,
                                  }).format(p.price_minor / 100)
                                : "Valor por configurar"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="button primary"
                        disabled={busy || status !== "Guardado"}
                        onClick={pay}
                      >
                        {busy
                          ? "Preparando checkout…"
                          : "Continuar a Mercado Pago"}
                      </button>
                    </>
                  )}
                  <small>
                    Estado: {status}. Se validan los datos, los medios y los
                    beneficios del plan.
                  </small>
                </div>
                {versions.length > 1 && (
                  <details style={{ marginTop: 20 }}>
                    <summary>Restaurar una publicación anterior</summary>
                    {versions.map((v) => (
                      <button
                        className="button small ghost"
                        style={{ margin: 7 }}
                        key={v.id}
                        disabled={v.id === initial.published_version_id || busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await api(
                              `/api/invitations/${initial.id}/rollback`,
                              "POST",
                              { versionId: v.id },
                            );
                            window.location.reload();
                          } catch (e) {
                            setError((e as Error).message);
                            setBusy(false);
                          }
                        }}
                      >
                        Versión {v.number}
                      </button>
                    ))}
                    <small>
                      Restaurar conserva las respuestas y no consume
                      republicaciones. El borrador queda separado.
                    </small>
                  </details>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
