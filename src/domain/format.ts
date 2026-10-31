import type { InvitationDocument } from "./document";
export const dateLabel = (d: InvitationDocument) =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: d.event.timezone,
  }).format(new Date(d.event.startsAt));
const escapeICS = (v: string) =>
  v
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
const utc = (v: string) =>
  new Date(v)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
export function calendarICS(d: InvitationDocument, uid: string) {
  const end =
    d.event.endsAt ??
    new Date(new Date(d.event.startsAt).getTime() + 7200000).toISOString();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pixvo//Invitaciones//ES",
    "BEGIN:VEVENT",
    `UID:${uid}@pixvo`,
    `DTSTAMP:${utc(d.event.startsAt)}`,
    `DTSTART:${utc(d.event.startsAt)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${escapeICS(d.event.title)}`,
    `DESCRIPTION:${escapeICS(d.event.message)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // Fold at <= 75 octets, preserving UTF-8 code points.
  return (
    lines
      .map((line) => {
        let out = "",
          part = "";
        for (const c of line) {
          if (new TextEncoder().encode(part + c).length > 73) {
            out += part + "\r\n ";
            part = "";
          }
          part += c;
        }
        return out + part;
      })
      .join("\r\n") + "\r\n"
  );
}
export function csvCell(value: unknown) {
  let v = String(value ?? "").replace(/[\r\n\t]/g, " ");
  if (/^[\s]*[=+\-@]/.test(v)) v = "'" + v;
  return '"' + v.replace(/"/g, '""') + '"';
}
export function csv(rows: unknown[][]) {
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
