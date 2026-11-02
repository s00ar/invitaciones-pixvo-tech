import { z } from "zod";
import { transaction } from "./db";
import { fail } from "./errors";
import { audit, type Invitation, type Plan } from "./services";
import type { User } from "./auth";
import { validatePlan, entitlementsSchema } from "../domain/document";

const details = {
  method: z.enum(["cash", "transfer", "other"]),
  note: z.string().trim().min(3).max(300),
  confirmed: z.literal(true),
};
const inputSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("existing"), orderId: z.uuid(), ...details }).strict(),
  z.object({ mode: z.literal("new"), requestId: z.uuid(), eventId: z.uuid(), planId: z.enum(["standard", "premium", "custom"]), amountMinor: z.number().int().positive().max(100000000), ...details }).strict(),
]);
type Order = { id: string; invitation_id: string; owner_id: string; status: string; amount_minor: number; currency: string; plan_snapshot: Plan };

// Records money already received outside checkout. Never calls a payment provider.
export async function confirmManualPayment(user: User, input: unknown) {
  if (user.role !== "admin") fail(403, "Acceso reservado a administración");
  const p = inputSchema.parse(input);
  return transaction(async (db) => {
    // Recheck the persisted role; a stale caller cannot retain admin privileges.
    if (!(await db.query("select id from profiles where id=$1 and role='admin'", [user.id])).rows.length)
      fail(403, "Acceso reservado a administración");
    const orderId = p.mode === "existing" ? p.orderId : p.requestId;
    let order: Order | undefined;
    let invitation: Invitation | undefined;
    if (p.mode === "new") {
      invitation = (await db.query<Invitation>("select * from invitations where id=$1 for update", [p.eventId])).rows[0];
      if (!invitation) fail(404, "Invitación no encontrada");
      order = (await db.query<Order>("select * from orders where id=$1", [orderId])).rows[0];
      if (order && (order.invitation_id !== p.eventId || order.amount_minor !== p.amountMinor || order.plan_snapshot.id !== p.planId))
        fail(409, "La solicitud ya fue utilizada para otro pago");
      if (!order) {
        if (invitation.entitlement_order_id) fail(409, "Esta invitación ya tiene un pago asignado. Revisá sus órdenes antes de registrar otro.");
        const plan = (await db.query<Plan>("select * from plans where id=$1 and active", [p.planId])).rows[0];
        if (!plan) fail(422, "Plan no disponible");
        entitlementsSchema.parse(plan.entitlements);
        try { validatePlan(invitation.draft_json, plan.entitlements); } catch (e) { fail(422, (e as Error).message); }
        order = { id: orderId, invitation_id: invitation.id, owner_id: invitation.owner_id, status: "pending", amount_minor: p.amountMinor, currency: "ARS", plan_snapshot: plan };
        await db.query("insert into orders(id,owner_id,invitation_id,plan_snapshot,amount_minor,currency) values($1,$2,$3,$4,$5,'ARS')", [order.id, order.owner_id, order.invitation_id, JSON.stringify(plan), order.amount_minor]);
      }
    } else {
      order = (await db.query<Order>("select * from orders where id=$1 for update", [orderId])).rows[0];
      if (!order) fail(404, "Orden no encontrada");
      invitation = (await db.query<Invitation>("select * from invitations where id=$1 for update", [order.invitation_id])).rows[0];
    }
    if (!invitation || !order) fail(404, "Invitación no encontrada");
    if (order.status === "approved") return { orderId, alreadyApproved: true };
    if (["refunded", "charged_back"].includes(order.status)) fail(409, "No se puede aprobar una orden reembolsada o contracargada");
    if (invitation.entitlement_order_id && invitation.entitlement_order_id !== orderId)
      fail(409, "La invitación tiene otro pago asignado");
    const entitlement = entitlementsSchema.parse(order.plan_snapshot.entitlements);
    await db.query("insert into payments(provider_id,order_id,status,amount_minor,currency) values($1,$2,'approved',$3,$4)", [`manual:${orderId}`, orderId, order.amount_minor, order.currency]);
    await db.query("update orders set status='approved' where id=$1", [orderId]);
    await db.query("update invitations set entitlement=$1,entitlement_order_id=$2,republications=0,expires_at=now()+($3*interval '1 day'),updated_at=now() where id=$4", [JSON.stringify(entitlement), orderId, entitlement.validDays, invitation.id]);
    await audit(db, user.id, "payment.manual.approved", orderId, { method: p.method, note: p.note, amountMinor: order.amount_minor, currency: order.currency, eventId: invitation.id });
    return { orderId, alreadyApproved: false };
  });
}
