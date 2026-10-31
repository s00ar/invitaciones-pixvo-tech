import { redirect } from "next/navigation";
export default async function Guests({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  redirect(`/app/invitaciones/${(await params).id}/respuestas`);
}
