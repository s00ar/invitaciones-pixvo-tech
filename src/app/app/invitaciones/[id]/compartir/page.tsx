import { currentUser } from "@/server/auth";
import { getInvitation } from "@/server/services";
import { Share } from "@/components/event-management";
import QRCode from "qrcode";
import { AppError } from "@/server/errors";
import { notFound } from "next/navigation";
export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) return null;
  const i = await getInvitation(user, (await params).id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const url = new URL(
      `/i/${i.slug}`,
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    ).href,
    qr =
      i.status === "published" && i.entitlement?.qr
        ? await QRCode.toDataURL(url, {
            width: 600,
            margin: 4,
            errorCorrectionLevel: "M",
          })
        : null;
  return <Share invitation={i} qr={qr} url={url} />;
}
