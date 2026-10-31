"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "./auth";
import { Notice } from "./ui";
import { statusLabels } from "./dashboard";
import Link from "next/link";
import { findCustomSample, type SampleStyle } from "@/domain/custom-samples";
export function Payments() {
  const [rows, setRows] = useState<
      {
        id: string;
        invitation_id: string;
        amount_minor: number;
        currency: string;
        status: string;
        created_at: string;
      }[]
    >([]),
    [error, setError] = useState("");
  useEffect(() => {
    api<typeof rows>("/api/orders")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <main className="workspace-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Todo en orden</p>
          <h1>Mis pagos</h1>
          <p>Los estados se verifican con Mercado Pago desde el servidor.</p>
        </div>
      </div>
      <Notice>
        Volver del checkout no confirma el pago. Cuando el proveedor lo
        verifique, podrás publicar desde el editor.
      </Notice>
      {error && <Notice error>{error}</Notice>}
      <div className="panel table-wrap" style={{ marginTop: 25 }}>
        <table>
          <thead>
            <tr>
              <th>Orden</th>
              <th>Importe</th>
              <th>Estado verificado</th>
              <th>Evento</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.id.slice(0, 8)}
                  <small>
                    {new Date(r.created_at).toLocaleDateString("es-AR")}
                  </small>
                </td>
                <td>
                  {new Intl.NumberFormat("es-AR", {
                    style: "currency",
                    currency: r.currency,
                  }).format(r.amount_minor / 100)}
                </td>
                <td>{statusLabels[r.status]}</td>
                <td>
                  <Link
                    className="text-link"
                    href={`/app/invitaciones/${r.invitation_id}/editar`}
                  >
                    Abrir editor ↗
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p style={{ padding: 25 }}>Todavía no tenés órdenes de pago.</p>
        )}
      </div>
      <button className="button ghost" onClick={() => window.location.reload()}>
        Consultar estado actualizado
      </button>
    </main>
  );
}
export function Profile({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const [message, setMessage] = useState(""),
    [error, setError] = useState(false);
  return (
    <main className="workspace-content">
      <div className="page-heading">
        <h1>Mi perfil</h1>
      </div>
      <section className="panel narrow">
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("/api/profile", "PATCH", {
                displayName: new FormData(e.currentTarget).get("name"),
              });
              setError(false);
              setMessage("Perfil guardado");
            } catch (e) {
              setError(true);
              setMessage((e as Error).message);
            }
          }}
        >
          <label className="field">
            Cómo te llamás
            <input name="name" defaultValue={displayName} maxLength={100} />
          </label>
          <label className="field">
            Email
            <input readOnly value={email} />
          </label>
          <button className="button primary">Guardar perfil</button>
        </form>
        {message && <Notice error={error}>{message}</Notice>}
      </section>
    </main>
  );
}
export function CustomRequest({ sampleId }: { sampleId?: SampleStyle }) {
  const sample = sampleId ? findCustomSample(sampleId) : undefined;
  const [items, setItems] = useState<
      { id: string; brief: string; state: string; delivery_url: string }[]
    >([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false);
  const load = useCallback(
    () =>
      api<typeof items>("/api/custom-requests")
        .then(setItems)
        .catch((e) => {
          setError(true);
          setMessage(e.message);
        }),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <main className="workspace-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Lo imaginamos con vos</p>
          <h1>Una invitación a tu medida.</h1>
          <p>
            Contanos tu idea. El alcance, el valor y la entrega se acuerdan
            antes de avanzar.
          </p>
        </div>
      </div>
      {sample && (
        <section className="panel narrow">
          <p>
            Muestra elegida: <strong>{sample.name}</strong>
          </p>
          <Link className="text-link" href={`/personalizadas/${sample.slug}`}>
            Volver a ver el diseño ↗
          </Link>
        </section>
      )}
      <section className="panel narrow">
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const result = await api<{ message: string }>(
                "/api/custom-requests",
                "POST",
                { brief: new FormData(e.currentTarget).get("brief") },
              );
              setError(false);
              setMessage(result.message);
              await load();
            } catch (e) {
              setError(true);
              setMessage((e as Error).message);
            }
          }}
        >
          <label className="field">
            Tu idea
            <textarea
              name="brief"
              defaultValue={
                sample
                  ? `Me interesa la muestra ${sample.name} para mis quince.\n\nFecha prevista:\nNombre de la homenajeada:\nDetalles que me gustaría personalizar:`
                  : undefined
              }
              required
              minLength={20}
              maxLength={4000}
              placeholder="Tipo de evento, fecha, estilo y lo que te gustaría incluir…"
            />
          </label>
          <button className="button primary">Guardar solicitud ↗</button>
        </form>
        {message && <Notice error={error}>{message}</Notice>}
      </section>
      {items.map((r) => (
        <section className="panel narrow" key={r.id}>
          <p className="eyebrow">
            {r.state === "received"
              ? "Solicitud recibida"
              : r.state === "in_progress"
                ? "En preparación"
                : "Entregado"}
          </p>
          <p style={{ whiteSpace: "pre-line" }}>{r.brief}</p>
          {r.delivery_url && (
            <a
              className="button ghost"
              href={r.delivery_url}
              target="_blank"
              rel="noreferrer"
            >
              Ver entrega ↗
            </a>
          )}
        </section>
      ))}
    </main>
  );
}
