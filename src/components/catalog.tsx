"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react";
import { templates, categories, type Template } from "@/domain/document";
import { fontStack } from "./invitation";
export function TemplateCard({
  t,
}: {
  t: Pick<
    Template,
    | "id"
    | "name"
    | "category"
    | "tier"
    | "theme"
    | "family"
    | "backgroundAsset"
    | "freeStyle"
  >;
}) {
  return (
    <article className="template-card">
      <Link
        href={`/preview/${t.id}`}
        className={`template-art art-${t.family}`}
        style={{
          backgroundColor: t.theme.background,
          color: t.theme.foreground,
          backgroundImage: `url(/${t.backgroundAsset})`,
        }}
        aria-label={`Ver ${t.name}`}
      >
        <span className="art-category">
          {categories[t.category as keyof typeof categories]}
        </span>
        <div
          className="art-inner"
          style={{ fontFamily: fontStack(t.theme.headingFont) }}
        >
          <span className="art-ornament">
            {t.family === "party"
              ? "↗"
              : t.family === "kids"
                ? "★"
                : t.family === "corporate"
                  ? "[ P ]"
                  : "✦"}
          </span>
          <strong>
            {t.category === "weddings"
              ? "Sofía & Mateo"
              : t.category === "xv"
                ? "Emilia"
                : t.category === "kids"
                  ? "¡Alex cumple!"
                  : t.category === "corporate"
                    ? "Ideas que conectan."
                    : "Esta noche es nuestra."}
          </strong>
          <span>18 · DICIEMBRE · 2027</span>
        </div>
        <span className="art-preview">
          Ver diseño <ArrowUpRight size={16} />
        </span>
      </Link>
      <div className="template-meta">
        <div>
          <h3>
            <Link href={`/preview/${t.id}`}>{t.name}</Link>
          </h3>
          <p>
            {t.freeStyle
              ? "Tu estilo desde cero"
              : categories[t.category as keyof typeof categories]}
          </p>
        </div>
        <span className={`badge ${t.tier === "premium" ? "premium" : ""}`}>
          {t.tier === "premium" ? "Premium" : "Estándar"}
        </span>
      </div>
    </article>
  );
}
export function Catalog({ activeIds }: { activeIds?: string[] }) {
  const params = useSearchParams(),
    router = useRouter();
  const category = params.get("category") ?? "",
    tier = params.get("plan") ?? "",
    q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);
  function update(key: string, value: string) {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    router.replace(`/templates?${p}`, { scroll: false });
  }
  const filtered = templates.filter(
    (t) =>
      (!activeIds || activeIds.includes(t.id)) &&
      (!category || t.category === category) &&
      (!tier || t.tier === tier) &&
      t.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="catalog-filters">
        <div className="tabs" aria-label="Filtrar por evento">
          <button
            className={!category ? "active" : ""}
            onClick={() => update("category", "")}
          >
            Todos los diseños
          </button>
          {Object.entries(categories).map(([id, name]) => (
            <button
              key={id}
              className={category === id ? "active" : ""}
              onClick={() => update("category", id)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <form
            className="search-field"
            onSubmit={(e) => {
              e.preventDefault();
              update("q", search);
            }}
          >
            <Search size={17} />
            <input
              aria-label="Buscar diseño"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Encontrá tu diseño"
            />
            <button type="submit" aria-label="Buscar">
              <ArrowRight size={16} />
            </button>
          </form>
          <label className="plan-filter">
            <SlidersHorizontal size={15} />
            <select
              aria-label="Filtrar por plan"
              value={tier}
              onChange={(e) => update("plan", e.target.value)}
            >
              <option value="">Todos los planes</option>
              <option value="standard">Estándar</option>
              <option value="premium">Premium</option>
            </select>
          </label>
          <span>{filtered.length} diseños</span>
        </div>
      </div>
      <div className="template-grid">
        {filtered.map((t) => (
          <TemplateCard key={t.id} t={t} />
        ))}
      </div>
      {!filtered.length && (
        <p className="empty-state">No encontramos diseños con esos filtros.</p>
      )}
    </>
  );
}
