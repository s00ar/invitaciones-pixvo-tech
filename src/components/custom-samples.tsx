import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { customSamples } from "@/domain/custom-samples";
import { SampleMotif } from "./sample-motif";
export function CustomSamplesGallery() {
  return (
    <div className="custom-samples-grid">
      {customSamples.map((s) => (
        <article className="custom-sample-card" key={s.id}>
          <Link
            href={`/personalizadas/${s.slug}`}
            className={`custom-sample-art sample-${s.id}`}
            style={
              {
                "--inv-bg": s.background,
                "--inv-fg": s.foreground,
                "--inv-accent": s.accent,
                "--sample-surface": s.surface,
                "--sample-muted": s.muted,
                "--sample-decor": s.decor,
                backgroundColor: s.background,
                color: s.foreground,
              } as CSSProperties
            }
            aria-label={`Ver muestra ${s.name}`}
          >
            <span className="custom-sample-top">MIS QUINCE AÑOS</span>
            <div className="custom-sample-art-content">
              <SampleMotif style={s.id} />
              <strong>Valentina</strong>
              <span>19 · JUNIO · 2027</span>
            </div>
            <span className="custom-sample-bottom">
              Explorar muestra <ArrowUpRight size={14} />
            </span>
          </Link>
          <div className="template-meta">
            <h3>
              <Link href={`/personalizadas/${s.slug}`}>{s.name}</Link>
            </h3>
            <span className="badge">A medida</span>
          </div>
          <p>{s.description}</p>
        </article>
      ))}
    </div>
  );
}
