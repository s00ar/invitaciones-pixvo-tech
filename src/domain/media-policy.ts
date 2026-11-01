export const mediaLimits = { image: 10e6, audio: 15e6, video: 10e6 } as const;
export const mediaLibraryLimit = 250e6;
export const maxUploadBytes = Math.max(...Object.values(mediaLimits));
export const maxUploadRequestBytes = maxUploadBytes + 1e6;
export type MediaKind = keyof typeof mediaLimits;
const mimeKinds: Record<string, MediaKind> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "audio/mpeg": "audio",
  "video/mp4": "video",
  "video/webm": "video",
};
const extensionKinds: Record<string, MediaKind> = {
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
  mp3: "audio",
  mp4: "video",
  webm: "video",
};
export const mediaAccept = Object.keys(mimeKinds).join(",");
export function mediaKind(mime: string): MediaKind | undefined {
  return Object.hasOwn(mimeKinds, mime) ? mimeKinds[mime] : undefined;
}
export function mediaSizeError(size: number, kind: MediaKind) {
  if (size === 0) return "El archivo está vacío. Elegí otro archivo.";
  if (size > mediaLimits[kind]) {
    const name = { image: "La imagen", audio: "El audio", video: "El video" }[
      kind
    ];
    return `${name} supera el límite de ${mediaLimits[kind] / 1e6} MB. Reducí su tamaño antes de subirlo.`;
  }
}
// Browser hints improve feedback; the server independently inspects file bytes.
export function mediaSelectionError(file: {
  name: string;
  type: string;
  size: number;
}) {
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  const kind =
    mediaKind(file.type) ??
    (Object.hasOwn(extensionKinds, extension)
      ? extensionKinds[extension]
      : undefined);
  if (!kind) return "Formato no admitido. Usá JPG, PNG, WebP, MP3, MP4 o WebM.";
  return mediaSizeError(file.size, kind);
}
