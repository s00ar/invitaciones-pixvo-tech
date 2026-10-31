import type { SampleStyle } from "@/domain/custom-samples";
export function SampleMotif({ style }: { style: SampleStyle }) {
  if (style === "envelope")
    return (
      <div className="sample-envelope-art" aria-hidden="true">
        <span className="sample-envelope-seal">XV</span>
      </div>
    );
  if (style === "butterfly")
    return (
      <span className="sample-motif sample-butterflies" aria-hidden="true">
        <svg viewBox="0 0 160 80" width="160" height="80">
          <path
            d="M78 40C24-20 7 7 28 39C4 66 42 82 78 44C114 82 152 66 128 39C149 7 132-20 78 40Z"
            fill="currentColor"
            opacity=".65"
          />
          <path
            d="M78 28V56M78 32L69 20M78 32L87 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  return (
    <span
      className={`sample-motif ${style === "royal" ? "sample-crown" : ""}`}
      aria-hidden="true"
    >
      {style === "romantic"
        ? "❀ ✧ ❀"
        : style === "royal"
          ? "♛"
          : "✦ DISCO NIGHT ✦"}
    </span>
  );
}
