/**
 * Utilities for building a recurring daily "time to study" reminder,
 * either as a Google Calendar link or a standard .ics (iCalendar) file.
 */

export const REMINDER_TITLE = "לימודא - זמן לימוד יומי";
export const DEFAULT_REMINDER_TIME = "20:30";
export const DEFAULT_REMINDER_DURATION_MINUTES = 15;
const ICS_FILENAME = "limuda-daily-reminder.ics";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number);
  const hours = Number.isFinite(h) ? h : 20;
  const minutes = Number.isFinite(m) ? m : 30;
  return { hours, minutes };
}

/** First occurrence of the given wall-clock time — today if still ahead, otherwise tomorrow. */
function getFirstOccurrence(time: string): Date {
  const { hours, minutes } = parseTime(time);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  if (start.getTime() <= now.getTime()) {
    start.setDate(start.getDate() + 1);
  }
  return start;
}

/** Floating local date-time (no timezone/UTC suffix) — keeps the reminder at the same wall-clock time every day. */
function formatFloatingDateTime(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(
    d.getMinutes()
  )}${pad(d.getSeconds())}`;
}

function formatUTCDateTime(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes()
  )}${pad(d.getUTCSeconds())}Z`;
}

function getReminderDescription(): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `זמן ללמוד בקצב שלך בלימודא: ${origin}`;
}

function escapeICSText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Google Calendar "add event" link for a daily-recurring study reminder. */
export function buildGoogleCalendarUrl(
  time: string = DEFAULT_REMINDER_TIME,
  durationMinutes: number = DEFAULT_REMINDER_DURATION_MINUTES
): string {
  const start = getFirstOccurrence(time);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const timeZone =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: REMINDER_TITLE,
    dates: `${formatFloatingDateTime(start)}/${formatFloatingDateTime(end)}`,
    details: getReminderDescription(),
    recur: "RRULE:FREQ=DAILY",
  });
  if (timeZone) params.set("ctz", timeZone);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Standard iCalendar (.ics) content for a daily-recurring study reminder. */
export function buildICSContent(
  time: string = DEFAULT_REMINDER_TIME,
  durationMinutes: number = DEFAULT_REMINDER_DURATION_MINUTES
): string {
  const start = getFirstOccurrence(time);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const uid = `limuda-daily-reminder-${Date.now()}@limuda.app`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Limuda//Daily Study Reminder//HE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatUTCDateTime(new Date())}`,
    `DTSTART:${formatFloatingDateTime(start)}`,
    `DTEND:${formatFloatingDateTime(end)}`,
    "RRULE:FREQ=DAILY",
    `SUMMARY:${escapeICSText(REMINDER_TITLE)}`,
    `DESCRIPTION:${escapeICSText(getReminderDescription())}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

/** Triggers a download of the .ics file (Apple Calendar / Outlook / any RFC5545-compatible app). */
export function downloadICSReminder(
  time: string = DEFAULT_REMINDER_TIME,
  durationMinutes: number = DEFAULT_REMINDER_DURATION_MINUTES
): void {
  const content = buildICSContent(time, durationMinutes);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = ICS_FILENAME;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

/** Opens the Google Calendar "add event" link in a new tab. */
export function openGoogleCalendarReminder(
  time: string = DEFAULT_REMINDER_TIME,
  durationMinutes: number = DEFAULT_REMINDER_DURATION_MINUTES
): void {
  window.open(buildGoogleCalendarUrl(time, durationMinutes), "_blank", "noopener,noreferrer");
}
