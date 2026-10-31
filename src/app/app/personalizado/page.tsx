import { CustomRequest } from "@/components/account";
import { findCustomSample } from "@/domain/custom-samples";
export default async function CustomPage({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string }>;
}) {
  const { sample } = await searchParams;
  const selected = sample ? findCustomSample(sample) : undefined;
  return (
    <CustomRequest key={selected?.id ?? "custom"} sampleId={selected?.id} />
  );
}
