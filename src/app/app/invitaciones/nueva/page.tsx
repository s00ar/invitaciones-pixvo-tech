import { redirect } from "next/navigation";
import { templates } from "@/domain/document";
import { CreateInvitation } from "@/components/create";
import { findCustomSample } from "@/domain/custom-samples";
export default async function NewInvitation({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; sample?: string }>;
}) {
  const { template, sample } = await searchParams;
  if (!template || !templates.some((t) => t.id === template))
    redirect("/templates");
  if (sample && (!findCustomSample(sample) || template !== "pixvo-free-xv"))
    redirect("/personalizadas");
  return (
    <CreateInvitation
      template={template}
      sampleId={sample ? findCustomSample(sample)?.id : undefined}
    />
  );
}
