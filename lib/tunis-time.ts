// Time helpers for the kindergarten's timezone (Africa/Tunis).
//
// Conventions used across the app:
// - "Day" values are UTC-midnight Date objects representing an
//   Africa/Tunis calendar day (see parseDay/todayTunis/dayKeyTunis
//   in lib/dates.ts).
// - Wall-clock schedule times are minutes since Tunis midnight
//   (0..1439), stored as Int — immune to DST and server timezone.
// - Actual instants (attendance arrival/departure, sessions) are
//   absolute Date times; convert to/from Tunis wall time with the
//   helpers below. Never use server-local Date methods for business
//   logic.

export const TUNIS_TZ = "Africa/Tunis";

export type TunisWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

const WEEKDAYS: TunisWeekday[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

const dtf = new Intl.DateTimeFormat("en-US", {
  timeZone: TUNIS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function tunisParts(instant: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== "literal") {
      parts[p.type] = parseInt(p.value, 10);
    }
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

// Offset (ms) to add to a UTC instant to get the Tunis wall clock.
function tunisOffsetMs(instant: Date): number {
  const p = tunisParts(instant);
  const wallAsUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second
  );
  return wallAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

// Converts an Africa/Tunis wall-clock time to the corresponding UTC
// instant. `dayKey` is "YYYY-MM-DD" (Tunis calendar day), `minutes`
// is minutes since Tunis midnight (0..1439). Two-pass offset lookup
// keeps DST transitions correct.
export function tunisWallToUtc(dayKey: string, minutes: number): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m || !Number.isInteger(minutes) || minutes < 0 || minutes >= 1440) {
    return null;
  }
  const dayStartUtc = Date.UTC(
    parseInt(m[1], 10),
    parseInt(m[2], 10) - 1,
    parseInt(m[3], 10)
  );
  const guess = dayStartUtc + minutes * 60_000;
  const first = guess - tunisOffsetMs(new Date(guess));
  return new Date(guess - tunisOffsetMs(new Date(first)));
}

// Converts "HH:MM" (or "HH:MM:SS") on a Tunis day to a UTC instant.
export function tunisTimeToUtc(dayKey: string, hhmm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) {
    return null;
  }
  const minutes = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  return tunisWallToUtc(dayKey, minutes);
}

// Converts an absolute instant to the Tunis wall-clock position:
// the Tunis calendar day ("YYYY-MM-DD") and minutes since midnight.
export function utcToTunisWall(instant: Date): {
  dayKey: string;
  minutes: number;
} {
  const p = tunisParts(instant);
  const dayKey = `${p.year}-${String(p.month).padStart(2, "0")}-${String(
    p.day
  ).padStart(2, "0")}`;
  return { dayKey, minutes: p.hour * 60 + p.minute };
}

// Weekday of an instant in Africa/Tunis. Accepts either an absolute
// instant or a UTC-midnight "day" Date (both represent the same
// Tunis calendar day under our convention).
export function tunisWeekdayOf(date: Date): TunisWeekday {
  const { dayKey } = utcToTunisWall(date);
  const y = parseInt(dayKey.slice(0, 4), 10);
  const mo = parseInt(dayKey.slice(5, 7), 10) - 1;
  const d = parseInt(dayKey.slice(8, 10), 10);
  // getUTCDay on a UTC-midnight date gives the correct calendar weekday.
  return WEEKDAYS[new Date(Date.UTC(y, mo, d)).getUTCDay()];
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Parses "HH:MM" to minutes since midnight; null when invalid.
export function hhmmToMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) {
    return null;
  }
  const minutes = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  return minutes >= 0 && minutes < 1440 ? minutes : null;
}
