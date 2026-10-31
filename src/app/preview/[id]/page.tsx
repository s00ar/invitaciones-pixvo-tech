import Link from "next/link";
import { notFound } from "next/navigation";
import { makeDocument, templates } from "@/domain/document";
import { InvitationRenderer } from "@/components/invitation";
import { ArrowLeft, ArrowRight } from "lucide-react";
export const metadata = {
  title: "Vista previa del diseño",
  robots: { index: false, follow: false },
};
export default async function Preview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = templates.find((t) => t.id === id);
  if (!t) notFound();
  return (
    <>
      <div className="preview-toolbar">
        <Link href="/templates">
          <ArrowLeft size={16} /> Diseños
        </Link>
        <div>
          <strong>{t.name}</strong>
          <span>Datos de ejemplo · Vista previa</span>
        </div>
        <Link
          className="button primary small"
          href={`/app/invitaciones/nueva?template=${id}`}
        >
          Usar diseño <ArrowRight size={15} />
        </Link>
      </div>
      <InvitationRenderer document={makeDocument(id)} />
    </>
  );
}
