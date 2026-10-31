import Link from "next/link";
import { ArrowUpRight, ArrowRight, Sparkles } from "lucide-react";
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Pixvo Invitaciones, inicio">
      <img
        src="/brand/pixvo-logo-header.webp"
        alt="Pixvo.Tech"
        width="119"
        height="34"
      />
      <span>invitaciones</span>
    </Link>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <div className="container nav">
        <Logo />
        <nav aria-label="Navegación principal">
          <Link href="/templates">Diseños</Link>
          <Link href="/precios">Planes</Link>
          <Link href="/#como-funciona">Cómo funciona</Link>
        </nav>
        <Link className="button small ghost" href="/app">
          Mi cuenta <ArrowUpRight size={15} />
        </Link>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="container footer">
      <Logo />
      <p>Una forma más tuya de decir «te espero».</p>
      <span>© {new Date().getFullYear()} Pixvo.Tech</span>
      <Link href="/privacidad">Privacidad y condiciones</Link>
    </footer>
  );
}
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="eyebrow">
      <Sparkles size={14} />
      {children}
    </p>
  );
}
export function CTA({
  href = "/templates",
  children = "Crear mi invitación",
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link className="button primary" href={href}>
      {children}
      <ArrowRight size={17} />
    </Link>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
