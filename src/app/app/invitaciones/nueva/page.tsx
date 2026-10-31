import { redirect } from "next/navigation";
import { templates } from "@/domain/document";
import { CreateInvitation } from "@/components/create";
export default async function NewInvitation({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;
  if (!template || !templates.some((t) => t.id === template))
    redirect("/templates");
  return <CreateInvitation template={template} />;
}
