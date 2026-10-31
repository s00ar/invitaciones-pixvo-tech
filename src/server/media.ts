import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { createClient } from "@supabase/supabase-js";
import { localMode, transaction } from "./db";
import { fail } from "./errors";
import {
  owned,
  publicInvitation,
  saveDraft,
  createInvitation,
  getInvitation,
  assertMedia,
} from "./services";
import type { User } from "./auth";
import { referencedMedia, type InvitationDocument } from "../domain/document";
export type Media = {
  id: string;
  owner_id: string;
  event_id: string;
  storage_key: string;
  mime: string;
  bytes: number;
  filename: string;
  state: string;
};
const storage = () => {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    fail(503, "Configuración pendiente: Supabase Storage");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  ).storage.from("pixvo-private");
};
const limits: Record<string, number> = {
  "image/jpeg": 10e6,
  "image/png": 10e6,
  "image/webp": 10e6,
  "audio/mpeg": 15e6,
  "video/mp4": 50e6,
  "video/webm": 50e6,
};
function localPath(key: string) {
  return path.join(
    path.resolve(
      /* turbopackIgnore: true */ process.env.PIXVO_DATA_DIR ?? ".data",
    ),
    "media",
    key,
  );
}
async function put(key: string, b: Buffer, mime: string) {
  if (localMode()) {
    const p = localPath(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, b, { flag: "wx" });
  } else {
    const { error } = await storage().upload(key, b, {
      contentType: mime,
      upsert: false,
    });
    if (error) fail(503, "La subida al almacenamiento falló");
  }
}
async function read(m: Media) {
  if (localMode()) return readFile(localPath(m.storage_key));
  const { data, error } = await storage().download(m.storage_key);
  if (error || !data) fail(503, "No se pudo recuperar el archivo");
  return Buffer.from(await data.arrayBuffer());
}
export async function upload(
  user: User,
  eventId: string,
  file: File,
  authorized: boolean,
) {
  if (!authorized)
    fail(422, "Confirmá que tenés autorización para usar el archivo");
  if (!file.size || file.size > 50e6)
    fail(413, "El archivo está vacío o supera 50 MB");
  await transaction((db) => owned(db, eventId, user));
  let bytes = Buffer.from(await file.arrayBuffer());
  const type = await fileTypeFromBuffer(bytes);
  if (!type || !limits[type.mime] || file.size > limits[type.mime])
    fail(
      422,
      "Formato o tamaño inválido. Usá JPG, PNG, WebP, MP3, MP4 o WebM.",
    );
  let mime = type.mime;
  if (mime.startsWith("image/")) {
    try {
      bytes = await sharp(bytes, { limitInputPixels: 40e6 })
        .rotate()
        .resize({
          width: 2560,
          height: 2560,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();
      mime = "image/webp";
    } catch {
      fail(422, "La imagen no se puede decodificar");
    }
  }
  return transaction(async (db) => {
    await owned(db, eventId, user, true);
    const used = Number(
      (
        await db.query<{ bytes: string }>(
          "select coalesce(sum(bytes),0) as bytes from media where event_id=$1 and state=$2",
          [eventId, "ready"],
        )
      ).rows[0].bytes,
    );
    if (used + bytes.length > 250e6)
      fail(413, "La biblioteca alcanzó la cuota de 250 MB");
    const id = randomUUID(),
      key = `${user.id}/${eventId}/${id}`;
    await put(key, bytes, mime);
    await db.query(
      "insert into media(id,owner_id,event_id,storage_key,mime,bytes,filename) values($1,$2,$3,$4,$5,$6,$7)",
      [id, user.id, eventId, key, mime, bytes.length, file.name.slice(0, 160)],
    );
    return { id, mime, filename: file.name.slice(0, 160) };
  });
}
export async function listMedia(user: User, eventId: string) {
  return transaction(async (db) => {
    await owned(db, eventId, user);
    return (
      await db.query<Media>(
        "select id,mime,bytes,filename,state from media where event_id=$1 and owner_id=$2 and state=$3 order by created_at desc",
        [eventId, user.id, "ready"],
      )
    ).rows;
  });
}
export async function getMedia(id: string, user: User | null, slug?: string) {
  const m = await transaction(async (db) => {
    const m = (
      await db.query<Media>("select * from media where id=$1 and state=$2", [
        id,
        "ready",
      ])
    ).rows[0];
    if (!m) fail(404, "Archivo no encontrado");
    if (user?.id === m.owner_id) return m;
    if (!slug) fail(404, "Archivo no encontrado");
    const { document } = await publicInvitation(db, slug);
    if (!referencedMedia(document).includes(id))
      fail(404, "Archivo no encontrado");
    return m;
  });
  return { bytes: await read(m), mime: m.mime };
}
export async function deleteMedia(user: User, id: string) {
  return transaction(async (db) => {
    const m = (
      await db.query<Media>("select * from media where id=$1 and owner_id=$2", [
        id,
        user.id,
      ])
    ).rows[0];
    if (!m) fail(404, "Archivo no encontrado");
    const docs = (
      await db.query<{ draft_json: InvitationDocument }>(
        "select draft_json from invitations where owner_id=$1",
        [user.id],
      )
    ).rows;
    if (
      docs.some((d) => referencedMedia(d.draft_json).includes(id)) ||
      (
        await db.query("select media_id from version_media where media_id=$1", [
          id,
        ])
      ).rows.length
    )
      fail(
        409,
        "El archivo está en un borrador o versión publicada. Quitalo del borrador; las versiones publicadas conservan sus recursos.",
      );
    await db.query("update media set state='deleted' where id=$1", [id]);
    return { message: "Archivo retirado de la biblioteca" };
  });
}
export async function duplicate(user: User, eventId: string) {
  const old = await getInvitation(user, eventId),
    created = await createInvitation(user, old.draft_json.templateId, {
      ...old.draft_json,
      event: {
        ...old.draft_json.event,
        title: old.draft_json.event.title.slice(0, 110) + " (copia)",
      },
    });
  const map: Record<string, string> = {};
  for (const mid of referencedMedia(old.draft_json)) {
    const m = await transaction(
      async (db) =>
        (
          await db.query<Media>(
            "select * from media where id=$1 and owner_id=$2",
            [mid, user.id],
          )
        ).rows[0],
    );
    if (!m) continue;
    const b = await read(m);
    const f = new File([new Uint8Array(b)], m.filename, { type: m.mime });
    map[mid] = (await upload(user, created.id, f, true)).id;
  }
  const doc = structuredClone(old.draft_json);
  doc.event.title = doc.event.title.slice(0, 110) + " (copia)";
  for (const k of ["backgroundMediaId", "videoId", "posterId"] as const)
    if (doc.theme[k]) doc.theme[k] = map[doc.theme[k]!];
  for (const b of doc.blocks) {
    if (b.props.audioId) b.props.audioId = map[b.props.audioId];
    if (b.props.photos)
      b.props.photos = b.props.photos.map((p) => ({
        ...p,
        mediaId: map[p.mediaId],
      }));
  }
  await transaction(async (db) =>
    assertMedia(db, await owned(db, created.id, user), doc),
  );
  await saveDraft(user, created.id, doc, 1);
  return created;
}
