import { Suspense } from "react";
import { Header, Footer, Eyebrow } from "@/components/ui";
import { Catalog } from "@/components/catalog";
import { configured } from "@/server/db";
import { getActiveTemplateIds } from "@/server/services";
export const metadata = { title: "Encontrá tu diseño" };
export const dynamic = "force-dynamic";
export default async function TemplatesPage() {
  const ids = configured() ? await getActiveTemplateIds() : undefined;
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
