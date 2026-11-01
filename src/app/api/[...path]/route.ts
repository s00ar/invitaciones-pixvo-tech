import { z } from "zod";
import {
  requireUser,
  currentUser,
  authenticate,
  signOut,
  supabase,
  safeNext,
  authCallbackUrl,
  hashToken,
} from "@/server/auth";
import { transaction, localMode, configured } from "@/server/db";
import { errorResponse, fail } from "@/server/errors";
import {
  clientIP,
  jsonBody,
  noStore,
  sameOrigin,
  limitedBody,
} from "@/server/http";
import * as service from "@/server/services";
import * as media from "@/server/media";
import * as billing from "@/server/payments";
import { csv, calendarICS } from "@/domain/format";
import { randomUUID } from "node:crypto";
import { templates } from "@/domain/document";
import { sampleStyles } from "@/domain/custom-samples";
import { maxUploadRequestBytes } from "@/domain/media-policy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
async function route(request: Request, ctx: Context) {
  try {
    const { path: p } = await ctx.params,
      method = request.method,
      url = new URL(request.url),
      send = (v: unknown, status = 200) =>
        Response.json(v, { status, headers: noStore });
    if (method !== "GET" && p.join("/") !== "webhooks/mercadopago")
      sameOrigin(request);
    if (p[0] === "templates" && method === "GET") {
      const active = configured()
        ? await transaction(async (db) =>
            (
              await db.query<{ id: string }>(
                "select id from templates where active=true",
              )
            ).rows.map((t) => t.id),
          )
        : templates.map((t) => t.id);
      return send(
        templates.filter(
          (t) =>
            active.includes(t.id) &&
            (!url.searchParams.get("category") ||
              t.category === url.searchParams.get("category")),
        ),
      );
    }
    if (!configured())
      fail(503, "Configuración pendiente: Supabase o modo local de desarrollo");
    if (p[0] === "plans" && method === "GET")
      return send(await service.getPlans());
    if (p[0] === "auth") {
      if (method === "GET")
        return send({ user: await currentUser(), local: localMode() });
      const input = await jsonBody(request);
      await transaction((db) =>
        service.rateLimit(db, `auth:${hashToken(clientIP(request))}`, 30, 300),
      );
      if (p[1] === "logout") {
        await signOut();
        return send({ ok: true });
      }
      if (p[1] === "google") {
        if (localMode()) fail(503, "Google requiere Supabase Auth");
        const { data, error } = await (
          await supabase()
        ).auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: authCallbackUrl(
              process.env.NEXT_PUBLIC_APP_URL,
              input.next,
            ),
          },
        });
        if (error || !data.url) fail(503, "Google no está configurado");
        return send({ url: data.url });
      }
      if (["login", "register"].includes(p[1])) {
        const a = z
          .object({
            email: z.email().max(254),
            password: z.string().min(10).max(128),
            next: z.string().optional(),
          })
          .parse(input);
        return send({
          ...(await authenticate(
            a.email.toLowerCase(),
            a.password,
            p[1] === "register",
            safeNext(a.next),
          )),
          next: safeNext(a.next),
        });
      }
      if (p[1] === "recover") {
        const a = z.object({ email: z.email() }).parse(input);
        if (localMode())
          fail(
            503,
            "El correo de recuperación requiere Supabase Auth; el modo local no envía correos",
          );
        const { error } = await (
          await supabase()
        ).auth.resetPasswordForEmail(a.email, {
          redirectTo: authCallbackUrl(
            process.env.NEXT_PUBLIC_APP_URL,
            "/actualizar-clave",
          ),
        });
        if (error) fail(503, "No se pudo solicitar la recuperación");
        return send({
          message:
            "Si la cuenta existe, recibirás un correo con instrucciones.",
        });
      }
      if (p[1] === "password") {
        await requireUser();
        const a = z
          .object({ password: z.string().min(10).max(128) })
          .parse(input);
        if (localMode())
          fail(
            503,
            "La recuperación de contraseña no está disponible en modo local",
          );
        const { error } = await (
          await supabase()
        ).auth.updateUser({ password: a.password });
        if (error) fail(400, "No se pudo actualizar la contraseña");
        return send({ message: "Contraseña actualizada" });
      }
    }
    if (p[0] === "webhooks" && p[1] === "mercadopago" && method === "POST")
      return send(await billing.webhook(request));
    if (p[0] === "public") {
      const slug = z
        .string()
        .regex(/^[a-z0-9-]{3,60}$/)
        .parse(p[1]);
      if (method === "GET") {
        const doc = await service.getPublic(slug);
        if (p[2] === "calendar")
          return new Response(calendarICS(doc, slug), {
            headers: {
              ...noStore,
              "Content-Type": "text/calendar; charset=utf-8",
              "Content-Disposition": 'attachment; filename="evento.ics"',
            },
          });
        return send({ document: doc });
      }
      const body = await jsonBody(request);
      if (p[2] === "rsvp")
        return send(await service.respond(slug, body, clientIP(request)));
      if (p[2] === "songs")
        return send(await service.songs(slug, body, clientIP(request)));
    }
    if (p[0] === "media" && p[1] && method === "GET") {
      const id = z.uuid().parse(p[1]),
        m = await media.getMedia(
          id,
          await currentUser(),
          url.searchParams.get("slug") ?? undefined,
        );
      const total = m.bytes.length,
        range = request.headers.get("range");
      let start = 0,
        end = total - 1,
        status = 200;
      if (range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(range);
        if (!match)
          return new Response(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${total}` },
          });
        start = Number(match[1]);
        end = match[2] ? Math.min(Number(match[2]), end) : end;
        if (start > end || start >= total)
          return new Response(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${total}` },
          });
        status = 206;
      }
      return new Response(new Uint8Array(m.bytes.subarray(start, end + 1)), {
        status,
        headers: {
          ...noStore,
          "Content-Type": m.mime,
          "Accept-Ranges": "bytes",
          "Content-Length": String(end - start + 1),
          ...(status === 206
            ? { "Content-Range": `bytes ${start}-${end}/${total}` }
            : {}),
        },
      });
    }
    const user = await requireUser();
    if (p[0] === "invitations") {
      const id = p[1];
      if (!id) {
        if (method === "GET") return send(await service.listInvitations(user));
        if (method === "POST") {
          const input = z
            .object({
              templateId: z.string(),
              sampleId: z.enum(sampleStyles).optional(),
            })
            .strict()
            .parse(await jsonBody(request));
          return send(
            await service.createInvitation(
              user,
              input.templateId,
              undefined,
              input.sampleId,
            ),
            201,
          );
        }
      }
      if (!p[2]) {
        if (method === "GET")
          return send(await service.getInvitation(user, id));
        if (method === "PATCH") {
          const b = z
            .object({
              document: z.unknown(),
              expectedRevision: z.number().int().positive(),
              slug: z.string().optional(),
            })
            .parse(await jsonBody(request));
          return send(
            await service.saveDraft(
              user,
              id,
              b.document,
              b.expectedRevision,
              b.slug,
            ),
          );
        }
      }
      if (method === "GET") {
        if (p[2] === "rsvps" || p[2] === "export.csv") {
          let rows = await service.responses(user, id);
          const filter = url.searchParams.get("response"),
            q = (url.searchParams.get("q") ?? "").toLowerCase();
          rows = rows.filter(
            (r) =>
              (!filter || (r.response ?? "pending") === filter) &&
              `${r.name ?? ""} ${r.label}`.toLowerCase().includes(q),
          );
          if (p[2] === "rsvps") return send(rows);
          return new Response(
            csv([
              [
                "Nombre",
                "Grupo",
                "Respuesta",
                "Asistentes",
                "Alimentación",
                "Mensaje",
              ],
              ...rows.map((r) => [
                r.name ?? "",
                r.label,
                r.response ?? "pending",
                r.attendees ?? 0,
                r.diet ?? "",
                r.message ?? "",
              ]),
            ]),
            {
              headers: {
                ...noStore,
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": 'attachment; filename="respuestas.csv"',
              },
            },
          );
        }
        if (p[2] === "media") return send(await media.listMedia(user, id));
        if (p[2] === "versions")
          return send(
            await transaction(async (db) => {
              await service.owned(db, id, user);
              return (
                await db.query(
                  "select id,number,document_json,created_at from invitation_versions where invitation_id=$1 order by number desc",
                  [id],
                )
              ).rows;
            }),
          );
        if (p[2] === "songs")
          return send(
            await transaction(async (db) => {
              await service.owned(db, id, user);
              return (
                await db.query(
                  "select title,artist,url,created_at from song_requests where event_id=$1 order by created_at desc",
                  [id],
                )
              ).rows;
            }),
          );
      }
      if (method === "POST") {
        if (p[2] === "duplicate")
          return send(await media.duplicate(user, id), 201);
        if (p[2] === "media") {
          const body = await new Response(
              await limitedBody(request, maxUploadRequestBytes),
              {
                headers: {
                  "Content-Type": request.headers.get("content-type") ?? "",
                },
              },
            ).formData(),
            file = body.get("file");
          if (!(file instanceof File)) fail(422, "Seleccioná un archivo");
          return send(
            await media.upload(
              user,
              id,
              file,
              body.get("authorized") === "true",
            ),
            201,
          );
        }
        const b = await jsonBody(request);
        if (p[2] === "publish")
          return send(
            await service.publish(
              user,
              id,
              z.number().int().positive().parse(b.expectedRevision),
            ),
          );
        if (p[2] === "rollback")
          return send(
            await service.rollback(user, id, z.uuid().parse(b.versionId)),
          );
        if (p[2] === "status") {
          await service.setStatus(user, id, b.status);
          return send({ ok: true });
        }
        if (p[2] === "guests")
          return send(
            await service.createGuest(user, id, b.label, b.maxAttendees),
            201,
          );
      }
    }
    if (p[0] === "media" && method === "DELETE")
      return send(await media.deleteMedia(user, z.uuid().parse(p[1])));
    if (p[0] === "orders") {
      if (method === "GET")
        return send(
          await transaction(
            async (db) =>
              (
                await db.query(
                  "select id,invitation_id,amount_minor,currency,status,created_at from orders where owner_id=$1 order by created_at desc",
                  [user.id],
                )
              ).rows,
          ),
        );
      if (method === "POST") {
        if (p[2] === "checkout")
          return send(await billing.checkout(user, p[1]));
        const b = z
          .object({
            eventId: z.uuid(),
            planId: z.enum(["standard", "premium", "custom"]),
          })
          .parse(await jsonBody(request));
        return send(await billing.createOrder(user, b.eventId, b.planId));
      }
    }
    if (p[0] === "profile" && method === "PATCH") {
      const name = z
        .string()
        .max(100)
        .parse((await jsonBody(request)).displayName);
      await transaction((db) =>
        db.query("update profiles set display_name=$1 where id=$2", [
          name,
          user.id,
        ]),
      );
      return send({ ok: true });
    }
    if (p[0] === "custom-requests") {
      if (method === "GET")
        return send(
          await transaction(
            async (db) =>
              (
                await db.query(
                  "select * from custom_requests where owner_id=$1 order by created_at desc",
                  [user.id],
                )
              ).rows,
          ),
        );
      if (method === "POST") {
        const brief = z
          .string()
          .min(20)
          .max(4000)
          .parse((await jsonBody(request)).brief);
        await transaction((db) =>
          db.query(
            "insert into custom_requests(id,owner_id,brief) values($1,$2,$3)",
            [randomUUID(), user.id, brief],
          ),
        );
        return send(
          {
            message:
              "Solicitud guardada. Podés seguir su estado desde tu cuenta.",
          },
          201,
        );
      }
    }
    if (p[0] === "admin") {
      if (user.role !== "admin") fail(403, "Acceso reservado a administración");
      if (method === "GET")
        return send(
          await transaction(async (db) => ({
            plans: (await db.query("select * from plans order by id")).rows,
            templates: (
              await db.query(
                "select id,active,category,config from templates order by id",
              )
            ).rows,
            events: (
              await db.query(
                "select id,slug,status,revision,updated_at,draft_json->'event'->>'title' as title from invitations order by updated_at desc limit 200",
              )
            ).rows,
            orders: (
              await db.query(
                "select id,amount_minor,currency,status,created_at from orders order by created_at desc limit 200",
              )
            ).rows,
            requests: (
              await db.query(
                "select * from custom_requests order by created_at desc limit 200",
              )
            ).rows,
            audit: (
              await db.query(
                "select action,entity_id,created_at from audit_log order by created_at desc limit 100",
              )
            ).rows,
          })),
        );
      const b = await jsonBody(request);
      if (p[1] === "plans") {
        await service.configurePlan(user, b);
        return send({ ok: true });
      }
      if (p[1] === "templates") {
        const a = z.object({ id: z.string(), active: z.boolean() }).parse(b);
        await transaction(async (db) => {
          await db.query("update templates set active=$1 where id=$2", [
            a.active,
            a.id,
          ]);
          await service.audit(db, user.id, "template.visibility", a.id);
        });
        return send({ ok: true });
      }
      if (p[1] === "requests") {
        const a = z
          .object({
            id: z.uuid(),
            state: z.enum(["received", "in_progress", "delivered"]),
            delivery_url: z
              .string()
              .max(1000)
              .refine((v) => !v || v.startsWith("https://")),
          })
          .parse(b);
        await transaction(async (db) => {
          await db.query(
            "update custom_requests set state=$1,delivery_url=$2 where id=$3",
            [a.state, a.delivery_url, a.id],
          );
          await service.audit(db, user.id, "request.update", a.id);
        });
        return send({ ok: true });
      }
      if (p[1] === "events") {
        const a = z
          .object({ id: z.uuid(), status: z.enum(["paused", "archived"]) })
          .parse(b);
        await transaction(async (db) => {
          await db.query("update invitations set status=$1 where id=$2", [
            a.status,
            a.id,
          ]);
          await service.audit(db, user.id, "admin.event.status", a.id, {
            status: a.status,
          });
        });
        return send({ ok: true });
      }
    }
    fail(404, "Ruta no encontrada");
  } catch (e) {
    return errorResponse(e);
  }
}
export { route as GET, route as POST, route as PATCH, route as DELETE };
