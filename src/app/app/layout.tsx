import Link from "next/link";
import {
  LayoutDashboard,
  Palette,
  Wallet,
  User,
  PenTool,
  Shield,
} from "lucide-react";
import { currentUser } from "@/server/auth";
import { localMode } from "@/server/db";
import { Logo } from "@/components/ui";
import { Logout, LoginRedirect } from "@/components/auth";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Tu espacio",
  robots: { index: false, follow: false },
};
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) return <LoginRedirect />;
  return (
    <>
      <div className="workspace">
        <aside className="sidebar">
          <Logo />
          <nav aria-label="Tu espacio">
            <Link href="/app">
              <LayoutDashboard size={17} />
              Mis invitaciones
            </Link>
            <Link href="/templates">
              <Palette size={17} />
              Explorar diseños
            </Link>
            <Link href="/app/pagos">
              <Wallet size={17} />
              Mis pagos
            </Link>
            <Link href="/app/personalizado">
              <PenTool size={17} />A tu medida
            </Link>
            <Link href="/app/perfil">
              <User size={17} />
              Mi perfil
            </Link>
            {user.role === "admin" && (
              <Link href="/admin">
                <Shield size={17} />
                Administración
              </Link>
            )}
          </nav>
          <div className="sidebar-bottom">
            <span>{user.email}</span>
            <Logout />
          </div>
        </aside>
        <div className="workspace-main">
          {localMode() && (
            <div className="local-banner">
              Desarrollo local · PostgreSQL en este equipo · Pagos externos sin
              configurar
            </div>
          )}
          <div className="workspace-top">
            <span>TU ESPACIO / PIXVO INVITACIONES</span>
            <span>{user.displayName || "Hola, ¡a celebrar!"}</span>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
