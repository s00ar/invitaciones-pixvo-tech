import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { findCustomSample } from "@/domain/custom-samples";
import { makeSampleDocument } from "@/domain/document";
import { InvitationRenderer } from "@/components/invitation";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const s = findCustomSample((await params).slug);
  return {
    title: s ? `${s.name} · Muestra XV` : "Muestra no encontrada",
    robots: { index: false, follow: false },
  };
}
export default async function CustomSamplePreview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const s = findCustomSample((await params).slug);
  if (!s) notFound();
  return (
    <>
      <div className="preview-toolbar">
        <Link href="/personalizadas">
          <ArrowLeft size={15} />
          Muestras
        </Link>
        <div>
          <strong>{s.name}</strong>
          <span>Datos ficticios · Vista previa</span>
        </div>
        <Link
          className="button primary small"
          href={`/app/invitaciones/nueva?template=pixvo-free-xv&sample=${s.id}`}
        >
          Usar este estilo
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <InvitationRenderer document={makeSampleDocument(s.id)} />
      <aside className="custom-sample-request">
        <p>¿Querés que Pixvo prepare una versión para vos?</p>
        <Link
          href={`/app/personalizado?sample=${s.id}`}
          className="button ghost"
        >
          Solicitar personalización ↗
        </Link>
      </aside>
    </>
  );
}
