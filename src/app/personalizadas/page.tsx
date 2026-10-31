import { Header, Footer, Eyebrow } from "@/components/ui";
import { CustomSamplesGallery } from "@/components/custom-samples";
export const metadata = {
  title: "Invitaciones personalizadas · Muestras XV",
  description:
    "Cinco estilos para tus quince: Romántica, Black Neon, Royal, Mariposas y Sobre Premium. Elegí una muestra y hacela tuya.",
};
export default function CustomSamplesPage() {
  return (
    <>
      <Header />
      <main className="container section">
        <Eyebrow>Imaginadas para tu gran noche</Eyebrow>
        <div className="section-heading">
          <h1>
            Tus quince.
            <br />
            <em>A tu manera.</em>
          </h1>
          <p>
            Cinco muestras para encontrar tu estilo.
            <br />
            Personalizá los detalles o contanos tu idea.
          </p>
        </div>
        <CustomSamplesGallery />
        <p className="custom-samples-note">
          Las muestras usan datos ficticios. Podés editar tu borrador antes de
          pagar; la publicación requiere un pago verificado.
        </p>
      </main>
      <Footer />
    </>
  );
}
