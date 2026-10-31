import { Header, Footer } from "@/components/ui";
export default function Privacy() {
  return (
    <>
      <Header />
      <main className="container section prose">
        <h1>Privacidad y condiciones</h1>
        <p>
          La plataforma almacena datos de cuenta, contenido de invitaciones y
          respuestas de asistencia para prestar el servicio. El organizador
          accede a las respuestas de su evento. Los invitados no necesitan crear
          una cuenta.
        </p>
        <p>
          Los enlaces públicos pueden reenviarse. El organizador puede elegir
          enlaces personales y debe compartir únicamente contenido autorizado.
          Los archivos de audio requieren activación del visitante.
        </p>
        <p className="notice">
          Lanzamiento comercial pendiente: el titular debe completar responsable
          y contacto de privacidad, términos de compra, política de retención,
          cancelación, reembolsos y ejercicio de derechos antes de habilitar
          ventas. Este texto informa el funcionamiento implementado y no
          reemplaza esas condiciones.
        </p>
      </main>
      <Footer />
    </>
  );
}
