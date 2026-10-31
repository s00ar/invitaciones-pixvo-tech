import { Responses } from "@/components/event-management";
export default async function Replies({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Responses id={(await params).id} />;
}
