export function parseDay(value: string): Date | null {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return null;
  }
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

const TUNIS_TZ = "Africa/Tunis";

// Returns today's date as a UTC-midnight Date representing the calendar day
// in the kindergarten's timezone (Africa/Tunis).
export function todayTunis(): Date {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: TUNIS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parseDay(key) ?? new Date();
}

// Returns "YYYY-MM-DD" for a UTC-midnight Date, interpreted in Africa/Tunis.
export function dayKeyTunis(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TUNIS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Lists every calendar day between start and end (inclusive), as UTC-midnight Dates.
export function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
