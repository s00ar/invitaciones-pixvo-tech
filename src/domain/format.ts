import type { InvitationDocument } from "./document";
const months = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
export function dateLabel(d: InvitationDocument, withTime = true) {
  // ICU punctuation/day periods vary between Node and WebKit. Use numeric parts
  // and explicit Spanish text so SSR and hydration produce the same string.
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: d.event.timezone,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(d.event.startsAt))
      .map((p) => [p.type, p.value]),
  );
  return `${Number(parts.day)} de ${months[Number(parts.month) - 1]} de ${parts.year}${withTime ? ` · ${parts.hour}:${parts.minute}` : ""}`;
}
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
