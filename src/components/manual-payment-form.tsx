"use client";
import { useRef, useState } from "react";
import { api } from "./auth";
import { Notice } from "./ui";
import type { Plan } from "@/server/services";

export function ManualPaymentForm({ events, plans, order, onSaved, onCancel }: {
  events: { id: string; title: string; slug: string }[];
  plans: Plan[];
  order?: { id: string; title: string; amount_minor: number; currency: string; plan_name: string };
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const requestId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <form className="panel form-grid" onSubmit={async e => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    requestId.current ??= crypto.randomUUID();
    setBusy(true); setError("");
    try {
      const details = { method: f.get("method"), note: f.get("note"), confirmed: f.get("confirmed") === "on" };
      const body = order ? { mode: "existing", orderId: order.id, ...details } : { mode: "new", requestId: requestId.current, eventId: f.get("event"), planId: f.get("plan"), amountMinor: Math.round(Number(f.get("amount")) * 100), ...details };
      await api("/api/admin/manual-payments", "POST", body);
      await onSaved();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }}>
    <h2>{order ? "Marcar orden como pagada" : "Registrar pago recibido"}</h2>
    {order ? <p>{order.title} · {order.plan_name} · {new Intl.NumberFormat("es-AR", { style: "currency", currency: order.currency }).format(order.amount_minor / 100)}</p> : <>
      <label className="field">Invitación<select name="event" required defaultValue=""><option value="" disabled>Elegí la invitación</option>{events.map(e => <option key={e.id} value={e.id}>{e.title} · {e.slug}</option>)}</select></label>
      <label className="field">Plan<select name="plan" required defaultValue=""><option value="" disabled>Elegí el plan pagado</option>{plans.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className="field">Importe recibido en pesos argentinos<input name="amount" type="number" min="0.01" max="1000000" step="0.01" required /></label>
    </>}
    <label className="field">Medio de pago<select name="method" required defaultValue=""><option value="" disabled>Elegí el medio</option><option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="other">Otro</option></select></label>
    <label className="field">Nota o referencia<input name="note" required minLength={3} maxLength={300} placeholder="Detalle breve del pago recibido" /><small>No incluyas datos bancarios ni información sensible.</small></label>
    <label className="check-field"><input name="confirmed" type="checkbox" required />Confirmo que este pago ya fue recibido y corresponde a la invitación seleccionada.</label>
    <p>Habilita la publicación del plan. No realiza cobros ni publica automáticamente la invitación.</p>
    {error && <Notice error>{error}</Notice>}
    <div className="inline-actions"><button className="button primary" disabled={busy}>{busy ? "Guardando…" : "Confirmar pago recibido"}</button><button className="button ghost" type="button" disabled={busy} onClick={onCancel}>Cancelar</button></div>
  </form>;
}
