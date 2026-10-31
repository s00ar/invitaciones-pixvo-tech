import { Header, Footer, Eyebrow } from "@/components/ui";
import { Plans } from "@/components/plans";
export const dynamic = "force-dynamic";
export const metadata = { title: "Planes" };
export default function Pricing() {
  return (
    <>
      <Header />
      <main className="container section">
        <div className="center-heading">
          <Eyebrow>Encontrá tu opción</Eyebrow>
          <h1>
            Tu celebración.
            <br />
            <em>A tu medida.</em>
          </h1>
          <p>
            Diseñá tu borrador antes de pagar. Revisá beneficios y vigencia al
            comprar.
          </p>
        </div>
        <Plans />
      </main>
      <Footer />
    </>
  );
}
