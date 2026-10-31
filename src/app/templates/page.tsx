import { Suspense } from "react";
import { Header, Footer, Eyebrow } from "@/components/ui";
import { Catalog } from "@/components/catalog";
import { configured, transaction } from "@/server/db";
export const metadata = { title: "Encontrá tu diseño" };
export const dynamic = "force-dynamic";
export default async function TemplatesPage() {
  const ids = configured()
    ? await transaction(async (db) =>
        (
          await db.query<{ id: string }>(
            "select id from templates where active=true",
          )
        ).rows.map((t) => t.id),
      )
    : undefined;
  return (
    <>
      <Header />
      <main className="container catalog-page">
        <Eyebrow>Tu historia empieza por acá</Eyebrow>
        <div className="catalog-title">
          <h1>
            Un diseño que
            <br />
            <em>se sienta tuyo.</em>
          </h1>
          <p>
            Elegí el punto de partida.
            <br />
            Los detalles los ponés vos.
          </p>
        </div>
        <Suspense fallback={<p>Cargando diseños…</p>}>
          <Catalog activeIds={ids} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
