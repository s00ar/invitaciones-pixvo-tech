"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="container empty-state">
      <h1>No pudimos cargar esta página.</h1>
      <p>Volvé a intentarlo en un momento.</p>
      <button className="button primary" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
