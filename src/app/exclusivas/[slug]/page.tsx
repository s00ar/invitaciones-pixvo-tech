import { notFound } from "next/navigation";
import { AzulInvitation } from "@/components/azul-invitation";
import { getPublic } from "@/server/services";
import { exclusiveBySlug } from "@/server/exclusives";
import { AppError } from "@/server/errors";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Invitación exclusiva",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exclusive = await exclusiveBySlug(slug);
  if (exclusive?.design !== "azul") notFound();
  const d = await getPublic(slug).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const audio = d.blocks.find((b) => b.type === "music" && b.enabled)?.props
    .audioId;
  return (
    <AzulInvitation
      document={d}
      slug={slug}
      audioUrl={
        audio
          ? `/api/media/${audio}?slug=${encodeURIComponent(slug)}`
          : undefined
      }
    />
  );
}
