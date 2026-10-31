import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  MousePointer2,
  Smartphone,
  Layers,
  CalendarCheck,
  Image as ImageIcon,
  MoveUpRight,
} from "lucide-react";
import { Header, Footer, Eyebrow, CTA } from "@/components/ui";
import { TemplateCard } from "@/components/catalog";
import { categories, templates } from "@/domain/document";
import { Plans } from "@/components/plans";
export const dynamic = "force-dynamic";
export default function Home() {
  const selections = [templates[6], templates[0], templates[17]];
  return (
    <>
      <Header />
      <main>
        <section className="container landing-hero">
          <div className="hero-copy">
            <Eyebrow>Pequeño enlace. Gran emoción.</Eyebrow>
            <h1>
              Tu gran momento.
              <br />
              Desde el <em>primer clic.</em>
            </h1>
            <p>
              Hay algo especial por celebrar. Creá una invitación tan única como
              tu historia y empezá a compartir la emoción.
            </p>
            <div className="hero-actions">
              <CTA />
              <Link href="/templates" className="text-link">
                Explorar diseños <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="hero-note">
              <span className="tiny-dot" />
              Diseñá a tu ritmo. Pagá cuando esté lista.
            </div>
          </div>
          <div
            className="hero-composition"
            aria-label="Ejemplos originales de invitaciones Pixvo"
          >
            <div className="composition-orbit" />
            <div className="floating-tag tag-top">
              <span>✦</span> Tu historia, tu estilo
            </div>
            <div className="sample-invite wedding-sample">
              <span className="sample-top">NOS CASAMOS</span>
              <span className="sample-number">18 / 12</span>
              <strong>
                Sofía
                <br />
                <i>&</i> Mateo
              </strong>
              <span>UN DÍA PARA RECORDAR</span>
              <div className="sample-line" />
              <small>CON VOS, TODO ES MÁS ESPECIAL</small>
            </div>
            <div className="sample-invite xv-sample">
              <span className="sample-top">MIS QUINCE</span>
              <span className="sample-flower">✦</span>
              <strong>Emilia</strong>
              <p>
                Una noche.
                <br />
                Mil recuerdos.
              </p>
              <span className="sample-date">18 · 12 · 27</span>
              <div className="sample-rsvp">
                ¿VENÍS? <ArrowUpRight size={12} />
              </div>
            </div>
            <div className="floating-tag tag-bottom">
              <Check size={15} /> La emoción ya empezó.
            </div>
            <div className="composition-label">
              DISEÑADA POR VOS. HECHA PARA COMPARTIR.
            </div>
          </div>
        </section>
        <section className="category-strip">
          <div className="container">
            <span>
              Para cada forma
              <br />
              de celebrar
            </span>
            {Object.entries(categories).map(([id, label], i) => (
              <Link href={`/templates?category=${id}`} key={id}>
                <span className="category-symbol">
                  {["✧", "♡", "↗", "★", "◈"][i]}
                </span>
                {label}
                <ArrowUpRight size={14} />
              </Link>
            ))}
          </div>
        </section>
        <section className="container section">
          <div className="section-heading">
            <div>
              <Eyebrow>El comienzo de algo tuyo</Eyebrow>
              <h2>
                Elegí un diseño.
                <br />
                <em>Hacelo inolvidable.</em>
              </h2>
            </div>
            <div>
              <p>
                27 puntos de partida, muchas formas de expresarte.
                <br />
                Colores, fotos y detalles que hablan de vos.
              </p>
              <Link className="text-link" href="/templates">
                Ver todos los diseños <ArrowRight size={17} />
              </Link>
            </div>
          </div>
          <div className="template-grid featured">
            {selections.map((t) => (
              <TemplateCard key={t.id} t={t} />
            ))}
          </div>
        </section>
        <section className="how-section section" id="como-funciona">
          <div className="container">
            <Eyebrow>De la idea al «ahí voy»</Eyebrow>
            <h2>
              Vos ponés el motivo.
              <br />
              <em>El resto fluye.</em>
            </h2>
            <div className="steps">
              {[
                {
                  n: "01",
                  title: "Encontrá tu estilo",
                  text: "Explorá el catálogo y elegí el diseño que te representa.",
                  icon: Layers,
                },
                {
                  n: "02",
                  title: "Dale tu toque",
                  text: "Sumá los detalles del evento, tus colores y tus recuerdos.",
                  icon: MousePointer2,
                },
                {
                  n: "03",
                  title: "Compartí la emoción",
                  text: "Revisá, pagá y publicá. Recibí las confirmaciones en tu cuenta.",
                  icon: MoveUpRight,
                },
              ].map((s) => (
                <article key={s.n}>
                  <div className="step-top">
                    <span>{s.n}</span>
                    <s.icon size={23} />
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="container section features-section">
          <div>
            <Eyebrow>Todo en un mismo lugar</Eyebrow>
            <h2>
              Menos mensajes.
              <br />
              <em>Más disfrutar.</em>
            </h2>
            <p>Que organizar también sea parte de lo lindo.</p>
            <CTA />
          </div>
          <div className="feature-grid">
            {[
              {
                icon: CalendarCheck,
                title: "Respuestas en orden",
                text: "Confirmaciones online, acompañantes y preferencias alimentarias. Exportá tu lista cuando quieras.",
              },
              {
                icon: Smartphone,
                title: "Siempre a mano",
                text: "Una URL para compartir con los detalles, horarios y lugares del encuentro.",
              },
              {
                icon: ImageIcon,
                title: "Tu mundo, tus detalles",
                text: "Fotos, mapa, regalos y música según tu plan. Cada bloque tiene su lugar.",
              },
              {
                icon: Layers,
                title: "Cambios sin sorpresas",
                text: "Guardá tu borrador y revisá cómo se ve antes de actualizar la invitación publicada.",
              },
            ].map((f) => (
              <article key={f.title}>
                <f.icon size={23} />
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="container section" id="planes">
          <div className="center-heading">
            <Eyebrow>Una invitación a tu medida</Eyebrow>
            <h2>
              Elegí cómo querés <em>celebrar.</em>
            </h2>
            <p>
              Explorá las opciones. Los valores se confirman antes de pagar.
            </p>
          </div>
          <Plans />
        </section>
        <section className="container section faq-section">
          <div>
            <Eyebrow>Antes del gran día</Eyebrow>
            <h2>
              Las dudas
              <br />
              <em>también tienen lugar.</em>
            </h2>
          </div>
          <div className="faqs">
            {[
              [
                "¿Puedo probar antes de pagar?",
                "Sí. Podés elegir un diseño, editar tu borrador y ver la vista previa. La publicación requiere un pago verificado.",
              ],
              [
                "¿Mis invitados necesitan una cuenta?",
                "No. Abren el enlace y responden online. Podés usar un enlace abierto o enlaces personales con cupos.",
              ],
              [
                "¿Puedo cambiar el diseño después?",
                "Sí. El editor conserva los datos, fotos y confirmaciones al cambiar de template. Revisá la nueva composición antes de publicarla.",
              ],
              [
                "¿Puedo usar mis fotos y mi música?",
                "Podés subir archivos que tengas autorización para usar, dentro de los límites de tu plan. La música se activa al tocar reproducir. Spotify se ofrece como enlace.",
              ],
              [
                "¿Cuánto tiempo queda disponible?",
                "La vigencia se informa en el plan antes de comprar. Podés pausar la invitación desde tu cuenta.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span>+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="container final-cta">
          <span className="cta-star">✦</span>
          <Eyebrow>La próxima historia es la tuya</Eyebrow>
          <h2>
            Que empiece
            <br />
            <em>lo inolvidable.</em>
          </h2>
          <CTA />
          <p>
            ¿Querés un diseño especial?{" "}
            <Link href="/app/personalizado">
              Contanos tu idea <ArrowUpRight size={13} />
            </Link>
          </p>
          {process.env.NEXT_PUBLIC_CONTACT_URL ? (
            <a className="text-link" href={process.env.NEXT_PUBLIC_CONTACT_URL}>
              Contactar a Pixvo ↗
            </a>
          ) : (
            <small>Canal de contacto comercial por configurar.</small>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
