import type { BlockType, InvitationDocument } from "./document";
const allowed: Record<BlockType, string[]> = {
  hero: ["eyebrow"],
  countdown: [],
  venues: ["title", "items"],
  message: ["title", "text"],
  rsvp: [
    "title",
    "text",
    "mode",
    "maxAttendees",
    "capacity",
    "closesAt",
    "askDiet",
    "whatsapp",
  ],
  calendar: ["title"],
  gallery: ["title", "photos"],
  dressCode: ["title", "text"],
  gifts: ["title", "text", "alias", "holder", "url"],
  music: ["title", "audioId", "volume", "spotify"],
  social: ["title", "url", "hashtag"],
  songRequests: ["title"],
  agenda: ["title", "items"],
};
export function publicProjection(d: InvitationDocument): InvitationDocument {
  return {
    ...d,
    blocks: d.blocks
      .filter((b) => b.enabled)
      .map((b) => ({
        ...b,
        props: Object.fromEntries(
          Object.entries(b.props).filter(([key]) =>
            allowed[b.type].includes(key),
          ),
        ),
      })),
  };
}
