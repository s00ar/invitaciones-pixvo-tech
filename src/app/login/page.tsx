import { AuthPage } from "@/components/auth-page";
export const dynamic = "force-dynamic";
export const metadata = { title: "Iniciar sesión", robots: { index: false } };
export default function Login() {
  return <AuthPage mode="login" />;
}
