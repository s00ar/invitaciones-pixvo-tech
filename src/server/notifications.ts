import { transaction } from "./db";

type Payload = {
  title: string;
  name: string;
  response: string;
  attendees: number;
  diet: string;
  message: string;
};
type Job = {
  id: string;
  channel: "email";
  payload: Payload;
  notification_email: string;
};
export function notificationConfiguration() {
  return {
    email: !!(
      process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL
    ),
    enabled: process.env.RSVP_NOTIFICATIONS_ENABLED === "true",
  };
}
export function notificationText(p: Payload) {
  return `${p.title}\n${p.name}: ${p.response === "yes" ? "Confirma asistencia" : "No asistirá"}\nPersonas: ${p.attendees}\nIntegrantes: ${p.message || "Sin detalle"}\nRestricciones alimentarias: ${p.diet || "No indicadas"}`;
}
export async function sendNotification(
  job: Job,
): Promise<{
  state: "accepted" | "failed" | "uncertain";
  providerId?: string;
}> {
  const p = job.payload;
  const url = "https://api.resend.com/emails";
  const body = {
    from: process.env.NOTIFICATION_FROM_EMAIL,
    to: [job.notification_email],
    subject: `Respuesta recibida · ${p.title}`,
    text: notificationText(p),
  };
  try {
    const r = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": job.id,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) return { state: r.status >= 500 ? "uncertain" : "failed" };
    const data = await r.json();
    const id = data.id;
    return typeof id === "string"
      ? { state: "accepted", providerId: id }
      : { state: "uncertain" };
  } catch {
    return { state: "uncertain" };
  }
}
export async function dispatchNotifications(eventId?: string) {
  const config = notificationConfiguration();
  if (!config.enabled) return { processed: 0, configuration: config };
  const channels = (["email"] as const).filter((c) => config[c]);
  if (!channels.length) return { processed: 0, configuration: config };
  // A crashed sender might already have submitted to the email provider. Do not automatically
  // resend ambiguous jobs: inspect provider delivery records before operator retry.
  await transaction((db) =>
    db.query(
      "update notification_outbox set state='uncertain',updated_at=now() where state='processing' and updated_at < now()-interval '5 minutes'",
    ),
  );
  let processed = 0;
  for (let n = 0; n < 10; n++) {
    const job = await transaction(async (db) => {
      const row = (
        await db.query<Job>(
          "select o.id,o.channel,o.payload,e.notification_email from notification_outbox o join exclusive_events e on e.event_id=o.event_id where o.state='pending' and o.channel=any($1::text[]) and ($2::uuid is null or o.event_id=$2) order by o.updated_at for update of o skip locked limit 1",
          [channels, eventId ?? null],
        )
      ).rows[0];
      if (row)
        await db.query(
          "update notification_outbox set state='processing',attempts=attempts+1,updated_at=now() where id=$1",
          [row.id],
        );
      return row;
    });
    if (!job) break;
    const result = await sendNotification(job);
    await transaction((db) =>
      db.query(
        "update notification_outbox set state=$1,provider_id=$2,updated_at=now() where id=$3",
        [result.state, result.providerId ?? null, job.id],
      ),
    );
    processed++;
  }
  return { processed, configuration: config };
}
