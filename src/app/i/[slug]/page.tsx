import { notFound } from "next/navigation";
import { getPublic } from "@/server/services";
import { InvitationRenderer } from "@/components/invitation";
import { AppError } from "@/server/errors";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const d = await getPublic(slug);
    return {
      title: d.event.title,
      description: d.event.description || d.event.message.slice(0, 160),
      robots: { index: false, follow: false },
      openGraph: {
        title: d.event.title,
        description: d.event.description || d.event.message.slice(0, 160),
      },
    };
  } catch {
    return {
      title: "Invitación no disponible",
      robots: { index: false, follow: false },
    };
  }
}
export default async function PublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ guest?: string }>;
}) {
  const { slug } = await params;
  const doc = await getPublic(slug).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const { guest } = await searchParams;
  return <InvitationRenderer document={doc} slug={slug} guest={guest} />;
}
