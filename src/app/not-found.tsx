import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container empty-state">
      <span className="eyebrow">Pixvo Invitaciones</span>
      <h1>Este enlace no está disponible.</h1>
      <p>Puede estar pausado, haber vencido o no estar publicado todavía.</p>
      <Link className="button primary" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
