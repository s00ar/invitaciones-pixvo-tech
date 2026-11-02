import { provisionAzul } from "../src/server/exclusives";
import { transaction } from "../src/server/db";
import { upload } from "../src/server/media";
import { saveDraft, getInvitation } from "../src/server/services";
import { readFile } from "node:fs/promises";
// Run with operator credentials in the environment. Never commits personal settings.
const email = process.env.AZUL_OWNER_EMAIL,
  phone = process.env.AZUL_NOTIFY_WHATSAPP;
if (!email || !phone)
  throw new Error(
    "Configurá AZUL_OWNER_EMAIL y AZUL_NOTIFY_WHATSAPP en el entorno privado",
  );
if (!process.env.AZUL_BRIEF_FILE)
  throw new Error("Falta AZUL_BRIEF_FILE con el documento privado del evento");
const document = JSON.parse(
  await readFile(process.env.AZUL_BRIEF_FILE, "utf8"),
);
if (!process.env.EXCLUSIVE_SLUG) throw new Error("Falta EXCLUSIVE_SLUG");
const id = await provisionAzul(email, phone, document, process.env.EXCLUSIVE_SLUG);
if (process.env.AZUL_AUDIO_FILE) {
  const owner = await transaction(
    async (db) =>
      (
        await db.query<{ id: string }>(
          "select owner_id as id from invitations where id=$1",
          [id],
        )
      ).rows[0],
  );
  const user = { id: owner.id, email, role: "owner", displayName: "" };
  const invitation = await getInvitation(user, id);
  if (
    !invitation.draft_json.blocks.some(
      (b) => b.type === "music" && b.props.audioId,
    )
  ) {
    const bytes = await readFile(process.env.AZUL_AUDIO_FILE);
    const media = await upload(
      user,
      id,
      new File([bytes], "espresso.m4a", { type: "audio/mp4" }),
      true,
    );
    const d = invitation.draft_json;
    d.blocks.push({
      id: "azul-music",
      type: "music",
      enabled: true,
      props: { audioId: media.id },
    });
    await saveDraft(user, id, d, invitation.revision);
  }
}
console.log(
  "Borrador preparado. No publicado; no se modificaron pagos ni derechos de plan.",
);
await globalThis.pixvoPool?.end();
await (await globalThis.pixvoDb)?.close();
