import { prisma } from "./prisma";
import { eachDay, todayTunis } from "./dates";
import { tunisWeekdayOf } from "./tunis-time";
import {
  applyExceptionsToSlots,
  exceptionInclude,
  type GlobalSlotRow,
  type ExceptionWithItems,
} from "./schedule-resolver";
import type { Weekday } from "../generated/prisma/enums";

// Materializes ScheduleOccurrence rows for a class over a date range.
// Idempotent via the unique `dedupeKey`. Never touches occurrences in
// the past, CANCELLED rows, or rows flagged manuallyEdited.

export const OCCURRENCE_HORIZON_DAYS = 60;

export function occurrenceHorizon(): { from: Date; to: Date } {
  const from = todayTunis();
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + OCCURRENCE_HORIZON_DAYS);
  return { from, to };
}

type Produced = {
  dedupeKey: string;
  classRoomId: number;
  date: Date;
  kind: "TIMETABLE_SLOT" | "ACTIVITY_SESSION" | "CLUB_SESSION";
  title: string;
  startMinutes: number;
  endMinutes: number;
  activityId: number | null;
  sourceType: string;
  sourceId: number | null;
  educatorId: number | null;
  tracksParticipation: boolean;
};

async function buildProduced(
  classRoomId: number,
  from: Date,
  to: Date
): Promise<Produced[]> {
  const dates = eachDay(from, to);
  const produced: Produced[] = [];

  // ---- Timetable slots (global + class exceptions) ----
  const versions = await prisma.timetableVersion.findMany({
    where: {
      isActive: true,
      validFrom: { lte: to },
      OR: [{ validTo: null }, { validTo: { gte: from } }],
    },
    orderBy: { validFrom: "desc" },
  });

  const exceptions = await prisma.classScheduleException.findMany({
    where: {
      classRoomId,
      validFrom: { lte: to },
      validTo: { gte: from },
    },
    orderBy: { id: "asc" },
    include: exceptionInclude,
  });

  // Cache slots per (versionId, weekday)
  const slotCache = new Map<string, GlobalSlotRow[]>();
  const getSlots = async (versionId: number, weekday: Weekday) => {
    const key = `${versionId}:${weekday}`;
    if (!slotCache.has(key)) {
      const rows = (await prisma.timetableSlot.findMany({
        where: { timetableId: versionId, weekday },
        include: { activity: { select: { id: true, title: true } } },
      })) as GlobalSlotRow[];
      slotCache.set(key, rows);
    }
    return slotCache.get(key)!;
  };

  for (const date of dates) {
    const dateKey = date.toISOString().slice(0, 10);
    const version = versions.find(
      (v) =>
        v.validFrom.getTime() <= date.getTime() &&
        (v.validTo === null || v.validTo.getTime() >= date.getTime())
    );
    if (!version) continue;

    const weekday = tunisWeekdayOf(date);
    const globalSlots = await getSlots(version.id, weekday);
    const exForDate = exceptions.filter(
      (e) => e.validFrom <= date && e.validTo >= date
    ) as unknown as ExceptionWithItems[];
    const resolved = applyExceptionsToSlots(globalSlots, exForDate, weekday);

    for (const slot of resolved) {
      // Only ACTIVITY-kind timetable slots with a linked activity track
      // participation. Meals, naps, breaks, arrival/departure never do.
      // Club-linked slots DO track: participation is confirmed manually.
      const tracks = slot.kind === "ACTIVITY" && slot.activityId != null;
      produced.push({
        dedupeKey: `t:${classRoomId}:${dateKey}:${slot.refId}`,
        classRoomId,
        date,
        kind: "TIMETABLE_SLOT",
        title: slot.title,
        startMinutes: slot.startMinutes,
        endMinutes: slot.endMinutes,
        activityId: slot.activityId,
        sourceType: slot.source === "EXCEPTION" ? "EXCEPTION" : "GLOBAL_SLOT",
        sourceId: slot.refId,
        educatorId: null,
        tracksParticipation: tracks,
      });
    }
  }

  // ---- Activity sessions (weekly recurring + one-time) ----
  const schedules = await prisma.activitySchedule.findMany({
    where: {
      isCancelled: false,
      AND: [
        { OR: [{ classRoomId: null }, { classRoomId }] },
        { validFrom: { lte: to } },
        { OR: [{ validTo: null }, { validTo: { gte: from } }] },
      ],
    },
    include: {
      activity: { select: { id: true, title: true, category: true } },
    },
  });

  for (const date of dates) {
    const dateKey = date.toISOString().slice(0, 10);
    const weekday = tunisWeekdayOf(date);
    for (const s of schedules) {
      const inWindow =
        s.validFrom.getTime() <= date.getTime() &&
        (s.validTo === null || s.validTo.getTime() >= date.getTime());
      if (!inWindow) continue;

      const matches =
        s.weekday === null
          ? date.getTime() === s.validFrom.getTime()
          : s.weekday === weekday;
      if (!matches) continue;

      produced.push({
        dedupeKey: `s:${classRoomId}:${dateKey}:${s.id}`,
        classRoomId,
        date,
        kind:
          s.activity.category === "CLUB" ? "CLUB_SESSION" : "ACTIVITY_SESSION",
        title: s.activity.title,
        startMinutes: s.startMinutes,
        endMinutes: s.endMinutes,
        activityId: s.activityId,
        sourceType: "ACTIVITY_SCHEDULE",
        sourceId: s.id,
        educatorId: s.educatorId,
        // Activity sessions (normal or club) always track participation:
        // normal activities are auto-computed, clubs are manually confirmed.
        tracksParticipation: true,
      });
    }
  }

  return produced;
}

// Creates missing occurrences and refreshes mutable fields of
// non-manual PLANNED occurrences. Orphaned future PLANNED occurrences
// (their source slot/schedule no longer produces them) are cancelled.
export async function syncClassOccurrences(
  classRoomId: number,
  from?: Date,
  to?: Date
): Promise<{ created: number; updated: number; cancelled: number }> {
  const range = from && to ? { from, to } : occurrenceHorizon();
  const produced = await buildProduced(classRoomId, range.from, range.to);
  const producedKeys = new Set(produced.map((p) => p.dedupeKey));
  const today = todayTunis().getTime();

  const existing = await prisma.scheduleOccurrence.findMany({
    where: {
      classRoomId,
      date: { gte: range.from, lte: range.to },
    },
  });
  const existingByKey = new Map(existing.map((o) => [o.dedupeKey, o]));

  let created = 0;
  let updated = 0;
  let cancelled = 0;

  const toCreate: Produced[] = [];
  const toUpdate: { id: number; data: Record<string, unknown> }[] = [];

  for (const p of produced) {
    const cur = existingByKey.get(p.dedupeKey);
    if (!cur) {
      toCreate.push(p);
      continue;
    }
    // Only refresh rows that are still planned, in the future, and not
    // manually edited. Cancelled/completed/past rows are immutable.
    if (
      cur.status === "PLANNED" &&
      !cur.manuallyEdited &&
      cur.date.getTime() >= today &&
      (cur.title !== p.title ||
        cur.startMinutes !== p.startMinutes ||
        cur.endMinutes !== p.endMinutes ||
        cur.activityId !== p.activityId ||
        cur.educatorId !== p.educatorId ||
        cur.tracksParticipation !== p.tracksParticipation ||
        cur.kind !== p.kind)
    ) {
      toUpdate.push({
        id: cur.id,
        data: {
          title: p.title,
          startMinutes: p.startMinutes,
          endMinutes: p.endMinutes,
          activityId: p.activityId,
          educatorId: p.educatorId,
          tracksParticipation: p.tracksParticipation,
          kind: p.kind,
        },
      });
    }
  }

  // Orphans: future PLANNED occurrences whose source no longer exists.
  const orphans = existing.filter(
    (o) =>
      o.status === "PLANNED" &&
      !o.manuallyEdited &&
      o.date.getTime() >= today &&
      !producedKeys.has(o.dedupeKey) &&
      o.sourceType !== "MANUAL"
  );

  await prisma.$transaction(async (tx) => {
    if (toCreate.length > 0) {
      for (const p of toCreate) {
        await tx.scheduleOccurrence.create({
          data: {
            dedupeKey: p.dedupeKey,
            classRoomId: p.classRoomId,
            date: p.date,
            kind: p.kind,
            title: p.title,
            startMinutes: p.startMinutes,
            endMinutes: p.endMinutes,
            activityId: p.activityId,
            sourceType: p.sourceType,
            sourceId: p.sourceId,
            educatorId: p.educatorId,
            tracksParticipation: p.tracksParticipation,
          },
        });
      }
      created = toCreate.length;
    }
    for (const u of toUpdate) {
      await tx.scheduleOccurrence.update({
        where: { id: u.id },
        data: u.data,
      });
      updated++;
    }
    for (const o of orphans) {
      await tx.scheduleOccurrence.update({
        where: { id: o.id },
        data: { status: "CANCELLED" },
      });
      cancelled++;
    }
  });

  return { created, updated, cancelled };
}

// Ensures occurrences exist for every class (used after global
// timetable changes).
export async function syncAllClassOccurrences(): Promise<void> {
  const { from, to } = occurrenceHorizon();
  const classRooms = await prisma.classRoom.findMany({ select: { id: true } });
  for (const c of classRooms) {
    await syncClassOccurrences(c.id, from, to);
  }
}

// Lazy ensure for read paths: cheap no-op when already materialized.
export async function ensureOccurrencesForClassDate(
  classRoomId: number,
  date: Date
): Promise<void> {
  await syncClassOccurrences(classRoomId, date, date);
}

// Kept for callers that only need "today" semantics.
export async function ensureOccurrencesToday(classRoomId: number) {
  const { from, to } = occurrenceHorizon();
  return syncClassOccurrences(classRoomId, from, to);
}

