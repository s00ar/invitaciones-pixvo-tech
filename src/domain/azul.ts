import { makeDocument, documentSchema } from "./document";

export const azulMap = "https://www.google.com/maps";
export function makeAzulDocument() {
  const d = makeDocument("pixvo-free-xv");
  d.event = {
    title: "Mis quince años",
    category: "xv",
    hosts: ["Nombre"],
    startsAt: "2099-12-05T21:00:00-03:00",
    endsAt: "2099-12-06T05:00:00-03:00",
    timezone: "America/Argentina/Buenos_Aires",
    message:
      "Hay momentos que se sueñan y se vuelven inolvidables al compartirlos. Te espero en mis XV.",
  };
  d.theme = {
    ...d.theme,
    background: "#f8f5ee",
    foreground: "#302b25",
    accent: "#84682e",
    headingFont: "Cormorant Garamond",
    bodyFont: "Georgia",
    backgroundAsset: "",
  };
  d.blocks = [
    {
      id: "azul-hero",
      type: "hero",
      enabled: true,
      props: { eyebrow: "Mis quince años" },
    },
    { id: "azul-countdown", type: "countdown", enabled: true, props: {} },
    {
      id: "azul-venue",
      type: "venues",
      enabled: true,
      props: {
        items: [
          {
            name: "Salón de ejemplo",
            address: "Dirección del evento",
            url: azulMap,
          },
        ],
      },
    },
    {
      id: "azul-rsvp",
      type: "rsvp",
      enabled: true,
      props: {
        mode: "open",
        unlimitedAttendees: true,
        askDiet: true,
        closesAt: "2099-11-11T00:00:00-03:00",
      },
    },
    {
      id: "azul-dress",
      type: "dressCode",
      enabled: true,
      props: {
        title: "Elegante",
        text: "Reservamos el rosa, blanco y plateado para la ocasión. Por favor, evitá estos colores y las prendas con brillos.",
      },
    },
    {
      id: "azul-gifts",
      type: "gifts",
      enabled: true,
      props: { alias: "alias.de.ejemplo" },
    },
    { id: "azul-songs", type: "songRequests", enabled: true, props: {} },
  ];
  return documentSchema.parse(d);
}
