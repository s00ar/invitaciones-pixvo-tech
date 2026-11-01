import { z } from "zod";
import catalog from "./presets.json" with { type: "json" };
import {
  customSamples,
  sampleStyles,
  type SampleStyle,
} from "./custom-samples";

export const categories = {
  xv: "Quince años",
  weddings: "Bodas",
  parties: "Fiestas",
  kids: "Infantiles",
  corporate: "Corporativos",
};
export const families = {
  editorial: "Editorial",
  ornamental: "Ornamental",
  party: "Fiesta / neón",
  kids: "Infantil",
  corporate: "Corporativa",
};
export const fonts = [
  "Urbanist",
  "Inter Tight",
  "Playfair Display",
  "DM Serif Display",
  "Cinzel",
  "Cormorant Garamond",
  "Montserrat",
  "Poppins",
  "Bebas Neue",
  "Nunito",
  "Fredoka",
  "Bungee",
  "Orbitron",
  "Sora",
  "Space Grotesk",
  "Dancing Script",
  "Great Vibes",
  "Pacifico",
  "Quicksand",
  "Outfit",
  "Roboto",
  "Lora",
  "Georgia",
  "Arial",
] as const;
const text = (max = 500) => z.string().max(max);
const https = z
  .string()
  .max(1000)
  .refine(
    (v) =>
      !v ||
      (() => {
        try {
          const u = new URL(v);
          return u.protocol === "https:" && !u.username && !u.password;
        } catch {
          return false;
        }
      })(),
    "Usá una URL HTTPS válida",
  );
const mediaId = z.uuid();
const instant = z.iso.datetime({ offset: true });
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const blockTypes = [
  "hero",
  "countdown",
  "venues",
  "message",
  "rsvp",
  "calendar",
  "gallery",
  "dressCode",
  "gifts",
  "music",
  "social",
  "songRequests",
  "agenda",
] as const;
export type BlockType = (typeof blockTypes)[number];
export const blockLabels: Record<BlockType, string> = {
  hero: "Portada",
  countdown: "Cuenta regresiva",
  venues: "Lugares",
  message: "Mensaje",
  rsvp: "Confirmación",
  calendar: "Calendario",
  gallery: "Galería",
  dressCode: "Vestimenta",
  gifts: "Regalos",
  music: "Música",
  social: "Redes",
  songRequests: "Canciones",
  agenda: "Agenda",
};
export const repeatable: BlockType[] = [
  "message",
  "venues",
  "gallery",
  "agenda",
];
const props = z
  .object({
    title: text(120).optional(),
    text: text(2000).optional(),
    eyebrow: text(80).optional(),
    items: z
      .array(
        z
          .object({
            name: text(120),
            address: text(300).optional(),
            time: text(40).optional(),
            description: text(500).optional(),
            url: https.optional(),
          })
          .strict(),
      )
      .max(20)
      .optional(),
    photos: z
      .array(
        z
          .object({
            mediaId,
            alt: text(160),
            caption: text(300).optional(),
            focusX: z.number().min(0).max(100).optional(),
            focusY: z.number().min(0).max(100).optional(),
          })
          .strict(),
      )
      .max(60)
      .optional(),
    maxAttendees: z.number().int().min(1).max(20).optional(),
    capacity: z.number().int().min(1).max(10000).optional(),
    mode: z.enum(["open", "guest"]).optional(),
    closesAt: instant.optional(),
    askDiet: z.boolean().optional(),
    whatsapp: z
      .string()
      .regex(/^\+?[0-9]{8,15}$/)
      .or(z.literal(""))
      .optional(),
    alias: text(100).optional(),
    holder: text(100).optional(),
    url: https.optional(),
    hashtag: text(100).optional(),
    audioId: mediaId.optional(),
    volume: z.number().min(0).max(1).optional(),
    spotify: https
      .refine(
        (v) => !v || new URL(v).hostname === "open.spotify.com",
        "Usá open.spotify.com",
      )
      .optional(),
  })
  .strict();
export const documentSchema = z
  .object({
    schemaVersion: z.literal(1),
    templateId: z
      .string()
      .refine((v) => catalog.some((t) => t.id === v), "Template inexistente"),
    templateVersion: z.literal(1),
    event: z
      .object({
        title: z.string().min(1).max(120),
        category: z.enum(["xv", "weddings", "parties", "kids", "corporate"]),
        startsAt: instant,
        endsAt: instant.nullish(),
        timezone: z
          .string()
          .max(80)
          .refine((v) => {
            try {
              new Intl.DateTimeFormat("es", { timeZone: v });
              return true;
            } catch {
              return false;
            }
          }, "Zona horaria inválida"),
        hosts: z.array(text(100)).max(10),
        message: text(2000),
        description: text(300).optional(),
      })
      .strict(),
    theme: z
      .object({
        accent: color,
        background: color,
        foreground: color,
        headingFont: z.enum(fonts),
        bodyFont: z.enum(fonts),
        radius: z.number().int().min(0).max(80),
        family: z.enum([
          "editorial",
          "ornamental",
          "party",
          "kids",
          "corporate",
        ]),
        backgroundAsset: z
          .string()
          .refine((v) => !v || catalog.some((t) => t.backgroundAsset === v)),
        backgroundMediaId: mediaId.optional(),
        videoId: mediaId.optional(),
        videoAutoplay: z.boolean().default(false),
        videoLoop: z.boolean().default(false),
        posterId: mediaId.optional(),
        overlay: z.number().min(0).max(0.9),
        focusX: z.number().min(0).max(100),
        focusY: z.number().min(0).max(100),
        align: z.enum(["left", "center", "right"]),
        scale: z.number().min(0.7).max(1.5),
        buttonScale: z.number().min(0.7).max(1.25).default(1),
        spacing: z.number().min(0.5).max(2),
        sampleStyle: z.enum(sampleStyles).optional(),
      })
      .strict(),
    blocks: z
      .array(
        z
          .object({
            id: z.string().min(1).max(80),
            type: z.enum(blockTypes),
            enabled: z.boolean(),
            props,
          })
          .strict(),
      )
      .min(2)
      .max(40),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (
      d.event.endsAt &&
      new Date(d.event.endsAt) <= new Date(d.event.startsAt)
    )
      ctx.addIssue({
        code: "custom",
        message: "El fin debe ser posterior al inicio",
        path: ["event", "endsAt"],
      });
    if (
      !d.blocks.some((b) => b.type === "hero" && b.enabled) ||
      !d.blocks.some((b) => b.type === "rsvp" && b.enabled)
    )
      ctx.addIssue({
        code: "custom",
        message: "Portada y confirmación son obligatorias",
        path: ["blocks"],
      });
    if (new Set(d.blocks.map((b) => b.id)).size !== d.blocks.length)
      ctx.addIssue({
        code: "custom",
        message: "Identificadores de bloque repetidos",
        path: ["blocks"],
      });
    for (const type of blockTypes)
      if (
        !repeatable.includes(type) &&
        d.blocks.filter((b) => b.type === type).length > 1
      )
        ctx.addIssue({
          code: "custom",
          message: `El bloque ${type} no es repetible`,
          path: ["blocks"],
        });
  });
export type InvitationDocument = z.infer<typeof documentSchema>;
export type Block = InvitationDocument["blocks"][number];
export type Template = (typeof catalog)[number];
// Do not ship competitor reference metadata to browsers.
export const templates = catalog.map(
  ({
    id,
    version,
    name,
    category,
    tier,
    family,
    freeStyle,
    theme,
    backgroundAsset,
    blocks,
    optionalBlocks,
    layoutNotes,
  }) => ({
    id,
    version,
    name,
    category,
    tier,
    family,
    freeStyle,
    theme,
    backgroundAsset,
    blocks,
    optionalBlocks,
    layoutNotes,
  }),
);
export function makeDocument(id: string): InvitationDocument {
  const t = templates.find((t) => t.id === id);
  if (!t) throw new Error("Template inexistente");
  const blocks: Block[] = blockTypes.map((type, i) => ({
    id: `${type}-${i}`,
    type,
    enabled: t.blocks.includes(type),
    props:
      type === "rsvp"
        ? { mode: "open", maxAttendees: 2, askDiet: true }
        : type === "hero"
          ? { eyebrow: categories[t.category as keyof typeof categories] }
          : {},
  }));
  return documentSchema.parse({
    schemaVersion: 1,
    templateId: t.id,
    templateVersion: 1,
    event: {
      title:
        t.category === "weddings"
          ? "Sofía & Mateo"
          : t.category === "xv"
            ? "Los quince de Emilia"
            : t.category === "kids"
              ? "El cumple de Alex"
              : t.category === "corporate"
                ? "Un nuevo encuentro"
                : "Una noche para celebrar",
      category: t.category,
      startsAt: "2027-12-18T21:00:00-03:00",
      timezone: "America/Argentina/Buenos_Aires",
      hosts: [],
      message:
        "Hay momentos que se vuelven inolvidables cuando los compartimos.",
    },
    theme: {
      ...t.theme,
      headingFont: fonts.includes(t.theme.headingFont as (typeof fonts)[number])
        ? t.theme.headingFont
        : "Georgia",
      bodyFont: "Inter Tight",
      family: t.family,
      backgroundAsset: t.backgroundAsset,
      overlay: 0.15,
      focusX: 50,
      focusY: 50,
      align: "center",
      scale: 1,
      spacing: 1,
    },
    blocks,
  });
}
export function changeTemplate(
  d: InvitationDocument,
  id: string,
): InvitationDocument {
  const n = makeDocument(id);
  return {
    ...d,
    templateId: id,
    templateVersion: 1,
    theme: {
      ...n.theme,
      backgroundMediaId: d.theme.backgroundMediaId,
      videoId: d.theme.videoId,
      videoAutoplay: d.theme.videoAutoplay ?? false,
      videoLoop: d.theme.videoLoop ?? false,
      buttonScale: d.theme.buttonScale ?? 1,
      posterId: d.theme.posterId,
    },
    blocks: d.blocks,
  };
}
export function applySample(
  d: InvitationDocument,
  id: SampleStyle,
): InvitationDocument {
  const s = customSamples.find((s) => s.id === id)!;
  return {
    ...d,
    theme: {
      ...d.theme,
      sampleStyle: s.id,
      accent: s.accent,
      background: s.background,
      foreground: s.foreground,
      headingFont: s.headingFont,
      bodyFont: "Inter Tight",
      family: s.family,
      backgroundAsset: "",
      overlay: 0,
      radius: 23,
      align: "center",
    },
  };
}
export function makeSampleDocument(id: SampleStyle): InvitationDocument {
  const d = applySample(makeDocument("pixvo-free-xv"), id);
  d.event = {
    ...d.event,
    title: "Valentina",
    startsAt: "2027-06-19T21:00:00-03:00",
    message: "Una noche, mil recuerdos. Quiero compartir este momento con vos.",
  };
  d.blocks = d.blocks.map((b) =>
    b.type === "hero"
      ? { ...b, props: { eyebrow: "Mis quince años" } }
      : b.type === "venues"
        ? {
            ...b,
            props: {
              title: "Una noche inolvidable",
              items: [
                {
                  name: "Salón Jardines del Sol",
                  address: "Dirección de ejemplo · Buenos Aires, Argentina",
                  url: "https://www.google.com/maps/search/?api=1&query=Buenos+Aires",
                },
              ],
            },
          }
        : b.type === "calendar"
          ? { ...b, enabled: true }
          : b.type === "message"
            ? { ...b, enabled: false }
            : b,
  );
  return documentSchema.parse(d);
}
export function referencedMedia(d: InvitationDocument) {
  return [
    ...new Set(
      [
        d.theme.backgroundMediaId,
        d.theme.videoId,
        d.theme.posterId,
        ...d.blocks.flatMap((b) => [
          b.props.audioId,
          ...(b.props.photos ?? []).map((p) => p.mediaId),
        ]),
      ].filter((v): v is string => !!v),
    ),
  ];
}
export const entitlementsSchema = z
  .object({
    tier: z.enum(["standard", "premium", "custom"]),
    photos: z.number().int().min(0).max(60),
    video: z.boolean(),
    audio: z.boolean(),
    qr: z.boolean(),
    republications: z.number().int().min(0).max(1000),
    validDays: z.number().int().min(1).max(3650),
  })
  .strict();
export type Entitlements = z.infer<typeof entitlementsSchema>;
export const defaultPlans = [
  {
    id: "standard",
    name: "Invitación básica",
    price_minor: 3500000,
    currency: "ARS",
    entitlements: {
      tier: "standard",
      photos: 4,
      video: false,
      audio: true,
      qr: false,
      republications: 3,
      validDays: 365,
    },
  },
  {
    id: "premium",
    name: "Invitación interactiva",
    price_minor: 6000000,
    currency: "ARS",
    entitlements: {
      tier: "premium",
      photos: 30,
      video: true,
      audio: true,
      qr: true,
      republications: 3,
      validDays: 365,
    },
  },
  {
    id: "custom",
    name: "Invitación premium",
    price_minor: 10000000,
    currency: "ARS",
    entitlements: {
      tier: "custom",
      photos: 60,
      video: true,
      audio: true,
      qr: true,
      republications: 1000,
      validDays: 365,
    },
  },
];
export function validatePlan(d: InvitationDocument, e: Entitlements) {
  const t = templates.find((t) => t.id === d.templateId)!;
  if (t.tier === "premium" && e.tier === "standard")
    throw new Error("Este template requiere Invitación interactiva o premium");
  if (
    d.blocks.reduce(
      (n, b) => n + (b.enabled ? (b.props.photos?.length ?? 0) : 0),
      0,
    ) > e.photos
  )
    throw new Error("La galería supera el límite del plan");
  if (d.theme.videoId && !e.video)
    throw new Error("El video requiere un plan habilitado");
  if (d.blocks.some((b) => b.enabled && b.props.audioId) && !e.audio)
    throw new Error("El audio requiere un plan habilitado");
}
