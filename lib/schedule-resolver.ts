import { prisma } from "./prisma";
import type {
  Weekday,
  TimetableSlotKind,
} from "../generated/prisma/enums";
import { tunisWeekdayOf } from "./tunis-time";

// Resolves the effective timetable for a class on a given day:
// global TimetableVersion slots + ClassScheduleException deltas.
// Pure read — does not write ScheduleOccurrence rows.

export interface ResolvedSlot {
  // Identity of the underlying plan element, for traceability:
  // timetableSlot.id for inherited slots, exceptionItem.id for
  // class-specific additions.
  refId: number;
  source: "GLOBAL" | "EXCEPTION";
  exceptionId: number | null;
  weekday: Weekday;
  kind: TimetableSlotKind;
  title: string;
  startMinutes: number;
  endMinutes: number;
  activityId: number | null;
  activityTitle: string | null;
  notes: string | null;
}

export async function getTimetableVersionForDate(date: Date) {
  return prisma.timetableVersion.findFirst({
    where: {
      isActive: true,
      validFrom: { lte: date },
      OR: [{ validTo: null }, { validTo: { gte: date } }],
    },
    orderBy: { validFrom: "desc" },
  });
}

export type GlobalSlotRow = {
  id: number;
  weekday: Weekday;
  position: number;
  kind: TimetableSlotKind;
  title: string;
  startMinutes: number;
  endMinutes: number;
  activityId: number | null;
  notes: string | null;
  activity: { id: number; title: string } | null;
};

export type ExceptionWithItems = {
  id: number;
  validFrom: Date;
  validTo: Date;
  items: {
    id: number;
    exceptionId: number;
    action: "MODIFY_SLOT" | "REMOVE_SLOT" | "ADD_SLOT";
    sourceSlotId: number | null;
    weekday: Weekday | null;
    kind: TimetableSlotKind | null;
    title: string | null;
    startMinutes: number | null;
    endMinutes: number | null;
    activityId: number | null;
    notes: string | null;
    activity: { id: number; title: string } | null;
  }[];
};

const exceptionInclude = {
  items: {
    orderBy: { id: "asc" as const },
    include: {
      activity: { select: { id: true, title: true } },
    },
  },
};

// Applies exception deltas to a list of global slots for one weekday.
// `exceptions` must already be filtered to those covering the date.
export function applyExceptionsToSlots(
  globalSlots: GlobalSlotRow[],
  exceptions: ExceptionWithItems[],
  weekday: Weekday
): ResolvedSlot[] {
  const removed = new Set<number>();
  const modified = new Map<
    number,
    ExceptionWithItems["items"][number]
  >();
  const added: ResolvedSlot[] = [];

  for (const ex of exceptions) {
    for (const item of ex.items) {
      if (
        (item.action === "REMOVE_SLOT" || item.action === "MODIFY_SLOT") &&
        item.sourceSlotId !== null
      ) {
        if (item.action === "REMOVE_SLOT") {
          removed.add(item.sourceSlotId);
          modified.delete(item.sourceSlotId);
        } else {
          modified.set(item.sourceSlotId, item);
        }
      } else if (item.action === "ADD_SLOT" && item.weekday === weekday) {
        added.push({
          refId: item.id,
          source: "EXCEPTION",
          exceptionId: ex.id,
          weekday,
          kind: item.kind ?? "OTHER",
          title: item.title ?? "Créneau ajouté",
          startMinutes: item.startMinutes ?? 0,
          endMinutes: item.endMinutes ?? 0,
          activityId: item.activityId,
          activityTitle: item.activity?.title ?? null,
          notes: item.notes,
        });
      }
    }
  }

  const resolved: ResolvedSlot[] = globalSlots
    .filter((s) => !removed.has(s.id))
    .map((s) => {
      const mod = modified.get(s.id);
      if (mod) {
        return {
          refId: s.id,
          source: "EXCEPTION" as const,
          exceptionId: mod.exceptionId,
          weekday,
          kind: mod.kind ?? s.kind,
          title: mod.title ?? s.title,
          startMinutes: mod.startMinutes ?? s.startMinutes,
          endMinutes: mod.endMinutes ?? s.endMinutes,
          // MODIFY replaces the slot entirely: a null activityId/notes
          // clears the link, while kind/title/times fall back to the
          // global values when not provided.
          activityId: mod.activityId,
          activityTitle:
            mod.activityId !== null ? (mod.activity?.title ?? null) : null,
          notes: mod.notes,
        };
      }
      return {
        refId: s.id,
        source: "GLOBAL" as const,
        exceptionId: null,
        weekday,
        kind: s.kind,
        title: s.title,
        startMinutes: s.startMinutes,
        endMinutes: s.endMinutes,
        activityId: s.activityId,
        activityTitle: s.activity?.title ?? null,
        notes: s.notes,
      };
    });

  resolved.push(...added);
  resolved.sort(
    (a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes
  );
  return resolved;
}

export async function resolveClassSchedule(
  classRoomId: number,
  date: Date // UTC-midnight Tunis day
): Promise<ResolvedSlot[]> {
  const weekday = tunisWeekdayOf(date);

  const version = await getTimetableVersionForDate(date);
  const globalSlots = version
    ? ((await prisma.timetableSlot.findMany({
        where: { timetableId: version.id, weekday },
        include: { activity: { select: { id: true, title: true } } },
      })) as GlobalSlotRow[])
    : [];

  const exceptions = (await prisma.classScheduleException.findMany({
    where: {
      classRoomId,
      validFrom: { lte: date },
      validTo: { gte: date },
    },
    orderBy: { id: "asc" },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          sourceSlot: {
            include: { activity: { select: { id: true, title: true } } },
          },
          activity: { select: { id: true, title: true } },
        },
      },
    },
  })) as unknown as ExceptionWithItems[];

  return applyExceptionsToSlots(globalSlots, exceptions, weekday);
}

// ---------- Conflict helpers (used by exception validation) ----------

export function rangesOverlap(
  aFrom: Date,
  aTo: Date,
  bFrom: Date,
  bTo: Date
): boolean {
  return aFrom.getTime() <= bTo.getTime() && bFrom.getTime() <= aTo.getTime();
}

// Does the intersection of two inclusive date ranges contain at least
// one day whose Tunis weekday is `weekday`?
export function intersectionHasWeekday(
  aFrom: Date,
  aTo: Date,
  bFrom: Date,
  bTo: Date,
  weekday: Weekday
): boolean {
  const start = Math.max(aFrom.getTime(), bFrom.getTime());
  const end = Math.min(aTo.getTime(), bTo.getTime());
  if (start > end) {
    return false;
  }
  const daySpan = Math.floor((end - start) / 86_400_000);
  // 7 consecutive days always contain every weekday.
  if (daySpan >= 6) {
    return true;
  }
  for (let t = start; t <= end; t += 86_400_000) {
    if (tunisWeekdayOf(new Date(t)) === weekday) {
      return true;
    }
  }
  return false;
}

export { exceptionInclude };
