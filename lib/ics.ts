export interface ICSEvent {
  title: string;
  notes?: string;
  dueAt: Date;
}

function formatDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeICS(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function generateICS(event: ICSEvent): string {
  const now = new Date();
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@credify.io`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Credify//Reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatDate(now)}`,
    `DTSTART:${formatDate(event.dueAt)}`,
    `DTEND:${formatDate(new Date(event.dueAt.getTime() + 60 * 60 * 1000))}`,
    `SUMMARY:${escapeICS(event.title)}`,
    event.notes ? `DESCRIPTION:${escapeICS(event.notes)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}
