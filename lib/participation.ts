import { prisma } from "@/lib/prisma";
import type { AttendanceStatus, ParticipationStatus, Prisma } from "@/generated/prisma/client";

type OccurrenceLike = {
  id: number;
  classRoomId: number;
  date: Date;
  startMinutes: number;
  endMinutes: number;
  status: string;
  tracksParticipation: boolean;
};

type AttendanceLike = {
  status: AttendanceStatus;
  arrivalTime: Date | null;
  departureTime: Date | null;
} | null;

// Tunis wall-clock day key for a Date stored as YYYY-MM-DD (SQLite stores dates
// as ISO strings; Prisma returns Date at UTC midnight). All schedule dates are
// already Tunisia business dates, so we compare the ISO date prefix.
export function dayKeyOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Minutes-of-day (Tunis) for an instant, via lib/tunis-time helpers.
import { utcToTunisWall } from "@/lib/tunis-time";

function wallMinutes(d: Date): number {
  return utcToTunisWall(d).minutes;
}

const ABSENT_STATUSES: AttendanceStatus[] = [
  "ABSENT_DECLARED",
  "ABSENT_EXCUSED",
  "ABSENT_UNEXCUSED",
];

export function computeAuto(
  occ: OccurrenceLike,
  att: AttendanceLike
): { status: ParticipationStatus; minutes: number | null } {
  if (occ.status === "CANCELLED") return { status: "CANCELLED", minutes: 0 };
  if (!att) return { status: "PENDING", minutes: null };
  if (ABSENT_STATUSES.includes(att.status)) {
    // Declared but not verified -> still pending until educator confirms.
    if (att.status === "ABSENT_DECLARED") return { status: "PENDING", minutes: null };
    return { status: "ABSENT", minutes: 0 };
  }
  if (att.status === "NOT_RECORDED") return { status: "PENDING", minutes: null };

  const arr = att.arrivalTime ? wallMinutes(att.arrivalTime) : null;
  const dep = att.departureTime ? wallMinutes(att.departureTime) : null;
  if (arr == null || dep == null) return { status: "PENDING", minutes: null };

  const start = Math.max(arr, occ.startMinutes);
  const end = Math.min(dep, occ.endMinutes);
  const minutes = Math.max(0, end - start);
  if (minutes <= 0) return { status: "ABSENT", minutes: 0 };

  const full = occ.endMinutes - occ.startMinutes;
  const ratio = full > 0 ? minutes / full : 0;
  return {
    status: ratio >= 0.8 ? "PRESENT" : "PARTIAL",
    minutes,
  };
}

// Recompute auto values for every participation of an occurrence, keeping any
// manual override untouched (manual result lives in status/manualStatus).
export async function recalcOccurrence(occurrenceId: number) {
  const occ = await prisma.scheduleOccurrence.findUnique({
    where: { id: occurrenceId },
    include: {
      participations: { include: { child: true } },
      activity: { select: { category: true } },
    },
  });
  if (!occ || !occ.tracksParticipation) return;
  const isClub = occ.activity?.category === "CLUB";

  const attendances = await prisma.attendance.findMany({
    where: { childId: { in: occ.participations.map((p) => p.childId) }, date: occ.date },
  });
  const attByChild = new Map(attendances.map((a) => [a.childId, a]));

  for (const p of occ.participations) {
    const att = attByChild.get(p.childId) ?? null;
    const auto = isClub
      ? { status: "PENDING" as ParticipationStatus, minutes: null }
      : computeAuto(occ, att);
    const manual = p.manualStatus ?? null;
    const status: ParticipationStatus =
      manual ?? (occ.status === "CANCELLED" ? "CANCELLED" : auto.status);
    await prisma.activityParticipation.update({
      where: { id: p.id },
      data: {
        status,
        autoStatus: auto.status,
        autoMinutes: auto.minutes,
        calculatedAt: new Date(),
        manualMinutes: manual != null ? p.manualMinutes : null,
      },
    });
  }
}

// Ensure participation rows exist for every child of the class on an occurrence
// (called by occurrence sync and by attendance saves).
export async function ensureParticipations(occurrenceIds: number[]) {
  if (occurrenceIds.length === 0) return;
  const occs = await prisma.scheduleOccurrence.findMany({
    where: { id: { in: occurrenceIds }, tracksParticipation: true },
    include: { classRoom: { include: { children: { select: { id: true } } } } },
  });
  for (const occ of occs) {
    for (const child of occ.classRoom.children) {
      await prisma.activityParticipation.upsert({
        where: { occurrenceId_childId: { occurrenceId: occ.id, childId: child.id } },
        create: { occurrenceId: occ.id, childId: child.id },
        update: {},
      });
    }
  }
  for (const occ of occs) await recalcOccurrence(occ.id);
}

// Recompute all participations of a class on a date (attendance save hook).
export async function recalcClassRoomDate(classRoomId: number, date: Date) {
  const occs = await prisma.scheduleOccurrence.findMany({
    where: { classRoomId, date, tracksParticipation: true },
    select: { id: true },
  });
  if (occs.length === 0) return;
  await ensureParticipations(occs.map((o) => o.id));
}

// Within a transaction: after attendance upsert, refresh participations.
export async function recalcAfterAttendance(
  tx: Prisma.TransactionClient,
  classRoomId: number,
  date: Date
) {
  const occs = await tx.scheduleOccurrence.findMany({
    where: { classRoomId, date, tracksParticipation: true },
    select: { id: true },
  });
  for (const o of occs) {
    const occ = await tx.scheduleOccurrence.findUnique({
      where: { id: o.id },
      include: { participations: true },
    });
    if (!occ) continue;
    const childIds = occ.participations.map((p) => p.childId);
    const children = await tx.child.findMany({
      where: { classRoomId },
      select: { id: true },
    });
    for (const c of children) {
      if (!childIds.includes(c.id)) {
        await tx.activityParticipation.create({
          data: { occurrenceId: occ.id, childId: c.id },
        });
      }
    }
    // Recompute with fresh attendance inside tx
    const fresh = await tx.scheduleOccurrence.findUnique({
      where: { id: occ.id },
      include: { participations: true, activity: { select: { category: true } } },
    });
    if (!fresh) continue;
    const isClub = fresh.activity?.category === "CLUB";
    const atts = await tx.attendance.findMany({
      where: { childId: { in: fresh.participations.map((p) => p.childId) }, date },
    });
    const attByChild = new Map(atts.map((a) => [a.childId, a]));
    for (const p of fresh.participations) {
      const att = attByChild.get(p.childId) ?? null;
      const auto = isClub
        ? { status: "PENDING" as ParticipationStatus, minutes: null }
        : computeAuto(fresh, att);
      const manual = p.manualStatus ?? null;
      await tx.activityParticipation.update({
        where: { id: p.id },
        data: {
          status: manual ?? (fresh.status === "CANCELLED" ? "CANCELLED" : auto.status),
          manualStatus: manual,
          autoStatus: auto.status,
          autoMinutes: auto.minutes,
          calculatedAt: new Date(),
          manualMinutes: manual != null ? p.manualMinutes : null,
        },
      });
    }
  }
}
