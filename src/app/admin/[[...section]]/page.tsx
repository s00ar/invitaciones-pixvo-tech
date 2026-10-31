import { currentUser } from "@/server/auth";
import { Header, Notice } from "@/components/ui";
import { LoginRedirect } from "@/components/auth";
import { Admin } from "@/components/admin";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};
export default async function AdminPage() {
  const user = await currentUser();
  if (!user) return <LoginRedirect />;
  if (user.role !== "admin")
    return (
      <>
        <Header />
        <main className="container section">
          <Notice error>Acceso reservado a administración.</Notice>
        </main>
      </>
    );
  return <Admin />;
}
