import { Responses } from "@/components/event-management";
import { requireUser } from "@/server/auth";
import { transaction } from "@/server/db";
import { owned } from "@/server/services";
import { notificationConfiguration } from "@/server/notifications";
export default async function Replies({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const info = await transaction(async (db) => {
    await owned(db, id, user);
    if (
      !(
        await db.query(
          "select event_id from exclusive_events where event_id=$1",
          [id],
        )
      ).rows[0]
    )
      return null;
    return (
      await db.query<{ state: string; count: string }>(
        "select state,count(*)::text as count from notification_outbox where event_id=$1 group by state",
        [id],
      )
    ).rows;
  });
  const config = notificationConfiguration();
  const labels: Record<string, string> = {
    pending: "pendientes",
    processing: "en proceso",
    accepted: "aceptados por el proveedor",
    failed: "fallidos",
    uncertain: "requieren revisión",
  };
  return (
    <>
      {info && (
        <aside className="panel" style={{ margin: 24, padding: 20 }}>
          <strong>Avisos de confirmación</strong>
          <p>
            {config.enabled && config.email
              ? "Correo habilitado. Los envíos aceptados no garantizan la entrega en la bandeja de entrada."
              : "Correo pendiente de configuración. Las respuestas se guardan y podés consultarlas aquí."}
          </p>
          <p>
            WhatsApp: cada invitado debe abrir el mensaje preparado y tocar
            Enviar. La plataforma no puede comprobar ese envío.
          </p>
          {info.map((row) => (
            <span key={row.state} style={{ marginRight: 16 }}>
              {row.count} {labels[row.state]}
            </span>
          ))}
        </aside>
      )}
      <Responses id={id} />
    </>
  );
}
