import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";
import { configured } from "@/server/db";
import { getPlans } from "@/server/services";
import { defaultPlans } from "@/domain/document";
export async function Plans() {
  const plans = configured()
    ? await getPlans()
    : defaultPlans.map((p) => ({
        ...p,
        price_minor: null,
        currency: "ARS",
        active: true,
      }));
  return (
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
            <p>
              {id === "custom"
                ? "Un proyecto de diseño acompañado por Pixvo."
                : "Creá y editá tu propia invitación."}
            </p>
            <Link
              href={
                id === "custom" ? "/app/personalizado" : `/templates?plan=${id}`
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
                p.entitlements.video
                  ? "Video y audio autorizados"
                  : "Mapa y calendario",
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
            {!p.price_minor && (
              <small>
                Precio pendiente de configuración. No se habilitan cobros.
              </small>
            )}
          </article>
        );
      })}
    </div>
  );
}
