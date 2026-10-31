import { currentUser } from "@/server/auth";
import { getInvitation, getPlans, owned } from "@/server/services";
import { transaction } from "@/server/db";
import { Editor } from "@/components/editor";
import type { InvitationDocument } from "@/domain/document";
import { notFound } from "next/navigation";
import { AppError } from "@/server/errors";
export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) return null;
  const { id } = await params;
  const initial = await getInvitation(user, id).catch((e) => {
      if (e instanceof AppError && e.status === 404) notFound();
      throw e;
    }),
    plans = await getPlans(),
    versions = await transaction(async (db) => {
      await owned(db, id, user);
      return (
        await db.query<{
          id: string;
          number: number;
          document_json: InvitationDocument;
        }>(
          "select id,number,document_json from invitation_versions where invitation_id=$1 order by number desc",
          [id],
        )
      ).rows;
    });
  return <Editor initial={initial} plans={plans} versions={versions} />;
}
