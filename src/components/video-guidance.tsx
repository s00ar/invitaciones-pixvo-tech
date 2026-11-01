import { mediaLimits } from "@/domain/media-policy";

export function VideoGuidance({ id }: { id: string }) {
  return (
    <div className="video-guidance">
      <p id={id}>
        <strong>MP4 o WebM · máximo {mediaLimits.video / 1e6} MB.</strong>{" "}
        Recomendamos MP4 con video H.264 y audio AAC si tiene sonido.
      </p>
      <details>
        <summary>Tamaño y orientación recomendados</summary>
        <ul>
          <li>Para celulares: vertical 9:16, 720 × 1280 o 1080 × 1920 px.</li>
          <li>
            Para computadora: horizontal 16:9, 1280 × 720 o 1920 × 1080 px.
          </li>
          <li>30 FPS, color SDR y entre 5 y 10 MB.</li>
          <li>
            Para un fondo, recomendamos de 10 a 20 segundos; no es un límite de
            duración.
          </li>
        </ul>
        <p>
          La misma pieza se usa en ambas vistas y se recorta para llenar la
          portada. Mantené lo importante en el centro, ajustá el foco y revisá
          móvil y desktop.
        </p>
        <p>
          La extensión .mp4 no garantiza compatibilidad: depende de su
          codificación. Los videos no se convierten ni comprimen
          automáticamente. Podés elegir inicio manual o reproducción automática
          sin sonido en Estilo y diseño. El sonido requiere una acción del
          visitante.
        </p>
      </details>
    </div>
  );
}
