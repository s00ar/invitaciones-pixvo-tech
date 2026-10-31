import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";
import { configured } from "@/server/db";
import { getPlans } from "@/server/services";
import { defaultPlans } from "@/domain/document";
const descriptions: Record<string, string> = {
  standard:
    "Diseño de plantilla, fotos, música, cuenta regresiva, ubicación y confirmación mediante WhatsApp.",
  premium:
    "Diseño personalizado, animaciones, galería, música, mapa y formulario RSVP.",
  custom:
    "Diseño exclusivo, animaciones avanzadas, panel privado de confirmaciones, gestión de invitados y funcionalidades adicionales.",
};
export async function Plans() {
  const plans = configured()
    ? await getPlans()
    : defaultPlans.map((p) => ({
        ...p,
        active: true,
      }));
  return (
    <>
      <div className="plans-grid">
        {["standard", "premium", "custom"].map((id) => {
          const p = plans.find((p) => p.id === id);
          if (!p) return null;
          return (
            <article
              className={`plan-card ${id === "premium" ? "highlight" : ""}`}
              key={p.id}
            >
              <span className="eyebrow">
                {id === "premium"
                  ? "Más posibilidades"
                  : id === "custom"
                    ? "Una idea especial"
                    : "Lo esencial, con tu estilo"}
              </span>
              <h3>{p.name}</h3>
              <div className="plan-price">
                {p.price_minor
                  ? new Intl.NumberFormat("es-AR", {
                      style: "currency",
                      currency: "ARS",
                      maximumFractionDigits: 0,
                    }).format(p.price_minor / 100)
                  : "Consultar valor"}
              </div>
              <span className="plan-currency">
                Pesos argentinos · por invitación
              </span>
              <p>{descriptions[id]}</p>
              <Link
                href={
                  id === "custom"
                    ? "/app/personalizado"
                    : `/templates?plan=${id}`
                }
                className={`button ${id === "premium" ? "primary" : "ghost"}`}
              >
                {id === "custom" ? "Contanos tu idea" : "Elegir un diseño"}
                <ArrowUpRight size={15} />
              </Link>
              <ul>
                {[
                  "Confirmaciones online y exportación CSV",
                  "Colores, tipografías y bloques",
                  `Hasta ${p.entitlements.photos} fotos`,
                  ...(p.entitlements.audio
                    ? ["Música con archivo autorizado"]
                    : []),
                  ...(p.entitlements.video ? ["Video para tu invitación"] : []),
                  p.entitlements.qr ? "URL y código QR" : "URL para compartir",
                  `${p.entitlements.republications} republicaciones`,
                  `${p.entitlements.validDays} días de vigencia del plan`,
                ].map((f) => (
                  <li key={f}>
                    <Check size={14} />
                    {f}
                  </li>
                ))}
              </ul>
              {id === "premium" && (
                <small className="plan-integration-status">
                  Google Sheets: integración pendiente. Las respuestas se
                  guardan en Pixvo y se pueden exportar como CSV.
                </small>
              )}
              {!p.price_minor && (
                <small>
                  Precio pendiente de configuración. No se habilitan cobros.
                </small>
              )}
            </article>
          );
        })}
      </div>
      <p className="plans-note">
        * Se pueden agregar adicionales según funcionalidades extra.
      </p>
    </>
  );
}
