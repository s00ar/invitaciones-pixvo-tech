"use client";
import { useState, useEffect } from "react";
import { api } from "./auth";
import { Notice } from "./ui";
import type { Plan } from "@/server/services";
import { categories } from "@/domain/document";
import { statusLabels } from "./dashboard";
import { ManualPaymentForm } from "./manual-payment-form";
type Data = {
  plans: Plan[];
  templates: {
    id: string;
    active: boolean;
    category: string;
    config: { name: string };
  }[];
  events: {
    id: string;
    title: string;
    slug: string;
    status: string;
    revision: number;
  }[];
  orders: {
    id: string;
    title: string;
    plan_name: string;
    manual: boolean;
    amount_minor: number;
    currency: string;
    status: string;
  }[];
  requests: {
    id: string;
    brief: string;
    state: string;
    delivery_url: string;
  }[];
  audit: { action: string; entity_id: string; created_at: string; actor_name: string | null; actor_id: string | null; metadata: { method?: string; note?: string; amountMinor?: number } }[];
};
function PlanEditor({
  p,
  onSave,
}: {
  p: Plan;
  onSave: (b: unknown) => Promise<void>;
}) {
  const [plan, setPlan] = useState(p);
  return (
    <form
      className="panel form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({
          id: plan.id,
          name: plan.name,
          price_minor: plan.price_minor,
          entitlements: plan.entitlements,
          active: plan.active,
        });
      }}
    >
      <h3>{p.id}</h3>
      <label className="field">
        Nombre
        <input
          value={plan.name}
          onChange={(e) => setPlan({ ...plan, name: e.target.value })}
          required
          maxLength={80}
        />
      </label>
      <label className="field">
        Precio en centavos ARS
        <input
          type="number"
          min="1"
          value={plan.price_minor ?? ""}
          onChange={(e) =>
            setPlan({
              ...plan,
              price_minor: e.target.value ? Number(e.target.value) : null,
            })
          }
        />
        <small>
          Vacío bloquea el checkout. El precio de órdenes existentes no cambia.
        </small>
      </label>
      {(["photos", "republications", "validDays"] as const).map((k) => (
        <label className="field" key={k}>
          {k}
          <input
            type="number"
            min={k === "validDays" ? 1 : 0}
            value={plan.entitlements[k]}
            onChange={(e) =>
              setPlan({
                ...plan,
                entitlements: {
                  ...plan.entitlements,
                  [k]: Number(e.target.value),
                },
              })
            }
          />
        </label>
      ))}
      {(["video", "audio", "qr"] as const).map((k) => (
        <label className="check-field" key={k}>
          <input
            type="checkbox"
            checked={plan.entitlements[k]}
            onChange={(e) =>
              setPlan({
                ...plan,
                entitlements: { ...plan.entitlements, [k]: e.target.checked },
              })
            }
          />
          {k}
        </label>
      ))}
      <label className="check-field">
        <input
          type="checkbox"
          checked={plan.active}
          onChange={(e) => setPlan({ ...plan, active: e.target.checked })}
        />
        Plan activo
      </label>
      <button className="button primary">Guardar plan</button>
    </form>
  );
}
export function Admin() {
  const [paymentForm, setPaymentForm] = useState<"new" | Data["orders"][number] | null>(null);
  const [data, setData] = useState<Data | null>(null),
    [tab, setTab] = useState("events"),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const load = () =>
    api<Data>("/api/admin")
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  async function mutate(path: string, b: unknown) {
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/${path}`, "POST", b);
      setMessage("Cambio guardado y registrado en auditoría");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <main className="container section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Operación de la plataforma</p>
          <h1>Administración</h1>
        </div>
        <a className="button ghost" href="/app">
          Volver a mi espacio
        </a>
      </div>
      <div className="tabs">
        {[
          ["events", "Eventos"],
          ["templates", "Templates"],
          ["plans", "Planes"],
          ["orders", "Pagos"],
          ["requests", "Encargos"],
          ["audit", "Auditoría"],
        ].map(([id, l]) => (
          <button
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() => setTab(id)}
          >
            {l}
          </button>
        ))}
      </div>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {!data ? (
        <p>Cargando administración…</p>
      ) : (
        <div style={{ marginTop: 30 }}>
          {tab === "plans" && (
            <>
              <Notice>
                Configuración comercial. Antes de habilitar PAYMENTS_ENABLED,
                verificá precios, beneficios, condiciones y sandbox. Las órdenes
                conservan su snapshot.
              </Notice>
              <div className="admin-grid" style={{ marginTop: 25 }}>
                {data.plans.map((p) => (
                  <PlanEditor
                    key={p.id}
                    p={p}
                    onSave={(b) => mutate("plans", b)}
                  />
                ))}
              </div>
            </>
          )}
          {tab === "templates" && (
            <div className="panel table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Template</th>
                    <th>Categoría</th>
                    <th>Disponible</th>
                  </tr>
                </thead>
                <tbody>
                  {data.templates.map((t) => (
                    <tr key={t.id}>
                      <td>
                        {t.config.name}
                        <small>{t.id}</small>
                      </td>
                      <td>
                        {categories[t.category as keyof typeof categories]}
                      </td>
                      <td>
                        <button
                          className="button small ghost"
                          onClick={() =>
                            mutate("templates", { id: t.id, active: !t.active })
                          }
                        >
                          {t.active ? "Ocultar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === "events" && (
            <div className="panel table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Estado</th>
                    <th>Revisión</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {i.title}
                        <small>{i.slug}</small>
                      </td>
                      <td>{statusLabels[i.status]}</td>
                      <td>{i.revision}</td>
                      <td>
                        <button
                          className="button small ghost"
                          onClick={() =>
                            mutate("events", { id: i.id, status: "paused" })
                          }
                        >
                          Pausar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === "orders" && (
            <>
              <Notice>
                Podés confirmar pagos ya recibidos por fuera de la web. Cada confirmación queda registrada con tu usuario y habilita el plan sin generar otro cobro.
              </Notice>
              <button className="button primary" onClick={() => setPaymentForm("new")}>Registrar pago recibido</button>
              {paymentForm && <ManualPaymentForm key={paymentForm === "new" ? "new" : paymentForm.id} events={data.events} plans={data.plans} order={paymentForm === "new" ? undefined : paymentForm} onCancel={() => setPaymentForm(null)} onSaved={async () => { setPaymentForm(null); setMessage("Pago registrado. La invitación ya puede publicarse desde su cuenta."); await load(); }} />}
              <div className="panel table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Orden</th>
                      <th>Importe</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((o) => (
                      <tr key={o.id}>
                        <td>{o.title}<small>{o.plan_name} · {o.id}</small></td>
                        <td>
                          {new Intl.NumberFormat("es-AR", {
                            style: "currency",
                            currency: o.currency,
                          }).format(o.amount_minor / 100)}
                        </td>
                        <td>{statusLabels[o.status]}{o.manual && <small>Pago manual</small>}</td>
                        <td>{["pending", "rejected"].includes(o.status) && <button className="button small ghost" onClick={() => setPaymentForm(o)}>Marcar como pagada</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {tab === "requests" &&
            data.requests.map((r) => (
              <form
                className="panel form-grid"
                key={r.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void mutate("requests", {
                    id: r.id,
                    state: f.get("state"),
                    delivery_url: f.get("url"),
                  });
                }}
              >
                <p style={{ whiteSpace: "pre-line" }}>{r.brief}</p>
                <label className="field">
                  Estado
                  <select name="state" defaultValue={r.state}>
                    <option value="received">Recibido</option>
                    <option value="in_progress">En preparación</option>
                    <option value="delivered">Entregado</option>
                  </select>
                </label>
                <label className="field">
                  URL HTTPS de entrega
                  <input name="url" type="url" defaultValue={r.delivery_url} />
                </label>
                <button className="button primary">Guardar encargo</button>
              </form>
            ))}
          {tab === "audit" && (
            <div className="panel table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Acción</th>
                    <th>Entidad</th>
                    <th>Fecha</th>
                    <th>Administrador / detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {data.audit.map((a, i) => (
                    <tr key={i}>
                      <td>{a.action}</td>
                      <td>{a.entity_id}</td>
                      <td>{new Date(a.created_at).toLocaleString("es-AR")}</td>
                      <td>{a.actor_name || a.actor_id || "Sistema"}{a.action === "payment.manual.approved" && <small>{a.metadata.method === "cash" ? "Efectivo" : a.metadata.method === "transfer" ? "Transferencia" : "Otro"} · {a.metadata.note}</small>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
