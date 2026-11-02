import { AzulInvitation } from "@/components/azul-invitation";
import { documentSchema } from "@/domain/document";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { localMode } from "@/server/db";
import { requireUser } from "@/server/auth";
import { exclusiveDraft } from "@/server/exclusives";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Vista previa · Invitación exclusiva",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (localMode()) {
    const d = documentSchema.parse(
      JSON.parse(
        await readFile(
          path.join(process.cwd(), ".data/azul/brief.json"),
          "utf8",
        ),
      ),
    );
    return (
      <AzulInvitation document={d} audioUrl="/api/exclusive-preview/audio" />
    );
  }
  const user = await requireUser();
  const { draft_json: d } = await exclusiveDraft(user, slug);
  const audio = d.blocks.find((b) => b.type === "music" && b.enabled)?.props
    .audioId;
  return (
    <AzulInvitation
      document={d}
      audioUrl={audio ? `/api/media/${audio}` : undefined}
    />
  );
}
