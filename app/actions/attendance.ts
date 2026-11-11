"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  getEducatorClassRoomIds,
  getParentChildIds,
  assertClassRoomAccess,
  assertChildAccess,
  canAccessChild,
} from "@/lib/permissions";
import { parseDay } from "@/lib/dates";
import { tunisTimeToUtc } from "@/lib/tunis-time";
import type { Prisma } from "@/generated/prisma/client";
import { recomputeDeclarationStatus } from "@/lib/absence-utils";
import { recalcAfterAttendance } from "@/lib/participation";

// Statuses an educator/admin can write. ABSENT_DECLARED is set by the
// declaration workflow; NOT_RECORDED is implicit (no row = "À vérifier").
const WRITABLE_STATUSES = [
  "PRESENT",
  "LATE",
  "ABSENT_EXCUSED",
  "ABSENT_UNEXCUSED",
] as const;

type WritableStatus = (typeof WRITABLE_STATUSES)[number];

const declarationDayInclude = {
  include: {
    declaration: { select: { id: true, status: true, reason: true } },
    verifier: { select: { name: true } },
  },
} as const;

export async function getAttendanceHome() {
  const user = await requireAuth();

  if (user.role === "ADMIN") {
    const classRooms = await prisma.classRoom.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, ageGroup: true },
    });
    return { role: user.role, classRooms, children: [] };
  }

  if (user.role === "EDUCATOR") {
    const classRoomIds = await getEducatorClassRoomIds(user.id);
    const classRooms = await prisma.classRoom.findMany({
      where: { id: { in: classRoomIds } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, ageGroup: true },
    });
    return { role: user.role, classRooms, children: [] };
  }

  const childIds = await getParentChildIds(user.id);
  const children = await prisma.child.findMany({
    where: { id: { in: childIds } },
    orderBy: { lastName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      enrollmentStatus: true,
      classRoom: { select: { id: true, name: true } },
    },
  });
  return { role: user.role, classRooms: [], children };
}

export async function getClassRoomAttendance(
  classRoomId: number,
  dateValue: string
) {
  const user = await requireAuth();
  await assertClassRoomAccess(user, classRoomId);

  const date = parseDay(dateValue);
  if (!date) {
    throw new Error("Date invalide");
  }

  const classRoom = await prisma.classRoom.findUnique({
    where: { id: classRoomId },
    include: {
      children: {
        orderBy: { lastName: "asc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          birthDate: true,
          enrollmentStatus: true,
        },
      },
    },
  });

  if (!classRoom) {
    throw new Error("Classe non trouvée");
  }

  const attendances = await prisma.attendance.findMany({
    where: {
      childId: { in: classRoom.children.map((c) => c.id) },
      date,
    },
    include: { declarationDays: declarationDayInclude },
  });

  const attendanceByChild = new Map(
    attendances.map((a) => [a.childId, a])
  );

  return {
    classRoom: {
      id: classRoom.id,
      name: classRoom.name,
      ageGroup: classRoom.ageGroup,
    },
    date: dateValue,
    children: classRoom.children.map((child) => ({
      ...child,
      // null => "À vérifier" (no attendance row). Never default to PRESENT.
      attendance: attendanceByChild.get(child.id) ?? null,
    })),
  };
}

// Times are "HH:MM" wall-clock values interpreted in Africa/Tunis on
// the given day (dateValue is the Tunis calendar day).
function parseTime(dateValue: string, time?: string) {
  if (!time) return null;
  return tunisTimeToUtc(dateValue, time);
}

function sameInstant(a: Date | null, b: Date | null): boolean {
  return (a?.getTime() ?? null) === (b?.getTime() ?? null);
}

// Syncs a PENDING declaration day after an educator/admin records attendance.
// Called inside the attendance transaction.
async function syncDeclarationDay(
  tx: Prisma.TransactionClient,
  attendanceId: number,
  newStatus: WritableStatus,
  userId: number
): Promise<void> {
  const day = await tx.absenceDeclarationDay.findUnique({
    where: { attendanceId },
  });
  if (!day || day.status !== "PENDING") {
    return;
  }

  let dayStatus: "CONFIRMED" | "NOT_APPLICABLE";
  let note: string | null = null;

  if (newStatus === "ABSENT_EXCUSED") {
    dayStatus = "CONFIRMED";
  } else {
    dayStatus = "NOT_APPLICABLE";
    note =
      newStatus === "ABSENT_UNEXCUSED"
        ? "Absence non excusée"
        : "Enfant présent";
  }

  await tx.absenceDeclarationDay.update({
    where: { id: day.id },
    data: {
      status: dayStatus,
      note,
      verifiedBy: dayStatus === "CONFIRMED" ? userId : null,
      verifiedAt: dayStatus === "CONFIRMED" ? new Date() : null,
    },
  });

  await recomputeDeclarationStatus(tx, day.declarationId);
}

interface AttendanceRecordInput {
  childId: number;
  status: string;
  arrivalTime?: string;
  departureTime?: string;
  reason?: string;
}

export async function saveClassRoomAttendance(
  classRoomId: number,
  dateValue: string,
  records: AttendanceRecordInput[]
) {
  const user = await requireAuth();
  await assertClassRoomAccess(user, classRoomId);

  const date = parseDay(dateValue);
  if (!date || !Array.isArray(records)) {
    return { error: "Paramètres invalides" };
  }

  const classRoom = await prisma.classRoom.findUnique({
    where: { id: classRoomId },
    include: { children: { select: { id: true } } },
  });

  if (!classRoom) {
    return { error: "Classe non trouvée" };
  }

  const classChildIds = new Set(classRoom.children.map((c) => c.id));

  const validRecords = records.filter((r) => r.status);
  for (const record of validRecords) {
    if (
      !Number.isInteger(record.childId) ||
      !classChildIds.has(record.childId) ||
      !WRITABLE_STATUSES.includes(record.status as WritableStatus)
    ) {
      return { error: "Enregistrement invalide" };
    }
  }

  // Detect modifications of existing records -> a reason is mandatory.
  const existing = await prisma.attendance.findMany({
    where: {
      date,
      childId: { in: validRecords.map((r) => r.childId) },
    },
  });
  const existingByChild = new Map(existing.map((a) => [a.childId, a]));

  const hasCorrection = validRecords.some((record) => {
    const prev = existingByChild.get(record.childId);
    if (!prev) return false;
    return (
      prev.status !== record.status ||
      !sameInstant(prev.arrivalTime, parseTime(dateValue, record.arrivalTime)) ||
      !sameInstant(prev.departureTime, parseTime(dateValue, record.departureTime))
    );
  });

  const reason = (records[0]?.reason || "").trim() || null;
  if (hasCorrection && !reason) {
    return {
      error:
        "Une raison est obligatoire pour modifier des présences déjà enregistrées",
    };
  }

  await prisma.$transaction(async (tx) => {
    for (const record of validRecords) {
      const status = record.status as WritableStatus;
      const arrivalTime = parseTime(dateValue, record.arrivalTime);
      const departureTime = parseTime(dateValue, record.departureTime);
      const prev = existingByChild.get(record.childId);

      const changed =
        prev &&
        (prev.status !== status ||
          !sameInstant(prev.arrivalTime, arrivalTime) ||
          !sameInstant(prev.departureTime, departureTime));

      const attendance = await tx.attendance.upsert({
        where: {
          childId_date: { childId: record.childId, date },
        },
        create: {
          childId: record.childId,
          date,
          status,
          arrivalTime,
          departureTime,
          recordedBy: user.id,
        },
        update: {
          status,
          arrivalTime,
          departureTime,
          recordedBy: user.id,
        },
      });

      if (changed) {
        await tx.attendanceHistory.create({
          data: {
            childId: record.childId,
            attendanceId: attendance.id,
            date,
            oldStatus: prev.status,
            newStatus: status,
            reason,
            changedBy: user.id,
          },
        });
      }

      await syncDeclarationDay(tx, attendance.id, status, user.id);
    }

    await recalcAfterAttendance(tx, classRoomId, date);
  });

  return { success: true };
}

// Correct a single attendance record. Reason is mandatory; every change is
// written to AttendanceHistory. Parents are rejected by assertChildAccess.
export async function correctAttendance(
  childId: number,
  dateValue: string,
  data: {
    status: string;
    arrivalTime?: string;
    departureTime?: string;
  },
  reason: string
) {
  const user = await requireAuth();

  const targetChild = await prisma.child.findUnique({
    where: { id: childId },
    select: { id: true, classRoomId: true },
  });
  if (!targetChild) {
    return { error: "Enfant non trouvé" };
  }
  await assertChildAccess(user, targetChild);

  const date = parseDay(dateValue);
  const trimmedReason = (reason || "").trim();
  if (!date || !trimmedReason) {
    return { error: "Paramètres invalides" };
  }
  if (!WRITABLE_STATUSES.includes(data.status as WritableStatus)) {
    return { error: "Statut invalide" };
  }

  const status = data.status as WritableStatus;
  const arrivalTime = parseTime(dateValue, data.arrivalTime);
  const departureTime = parseTime(dateValue, data.departureTime);

  const prev = await prisma.attendance.findUnique({
    where: { childId_date: { childId, date } },
  });

  await prisma.$transaction(async (tx) => {
    const attendance = await tx.attendance.upsert({
      where: { childId_date: { childId, date } },
      create: {
        childId,
        date,
        status,
        arrivalTime,
        departureTime,
        recordedBy: user.id,
      },
      update: {
        status,
        arrivalTime,
        departureTime,
        recordedBy: user.id,
      },
    });

    await tx.attendanceHistory.create({
      data: {
        childId,
        attendanceId: attendance.id,
        date,
        oldStatus: prev?.status ?? null,
        newStatus: status,
        reason: trimmedReason,
        changedBy: user.id,
      },
    });

    await syncDeclarationDay(tx, attendance.id, status, user.id);
  });

  return { success: true };
}

export async function getAttendanceHistory(filters: {
  childName?: string;
  classRoomId?: number;
  from?: string;
  to?: string;
}) {
  const user = await requireAuth();

  let childScope: number[] | undefined;
  if (user.role === "EDUCATOR") {
    const classRoomIds = await getEducatorClassRoomIds(user.id);
    const children = await prisma.child.findMany({
      where: { classRoomId: { in: classRoomIds } },
      select: { id: true },
    });
    childScope = children.map((c) => c.id);
  } else if (user.role === "PARENT") {
    childScope = await getParentChildIds(user.id);
  }

  const from = filters.from ? parseDay(filters.from) : undefined;
  const to = filters.to ? parseDay(filters.to) : undefined;
  if (to) {
    to.setUTCDate(to.getUTCDate() + 1);
  }

  const attendances = await prisma.attendance.findMany({
    where: {
      ...(childScope ? { childId: { in: childScope } } : {}),
      ...(filters.classRoomId ? { child: { classRoomId: filters.classRoomId } } : {}),
      ...(filters.childName
        ? {
            child: {
              OR: [
                { firstName: { contains: filters.childName } },
                { lastName: { contains: filters.childName } },
              ],
            },
          }
        : {}),
      ...(from || to
        ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } }
        : {}),
    },
    include: {
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          classRoom: { select: { id: true, name: true } },
        },
      },
      recorder: { select: { name: true } },
      declarationDays: declarationDayInclude,
    },
    orderBy: { date: "desc" },
    take: 300,
  });

  return attendances;
}

export async function getChildAttendance(childId: number) {
  const user = await requireAuth();

  if (!Number.isInteger(childId)) {
    throw new Error("Paramètres invalides");
  }

  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      enrollmentStatus: true,
      classRoom: { select: { id: true, name: true } },
    },
  });

  if (!child) {
    throw new Error("Enfant non trouvé");
  }

  const allowed = await canAccessChild(user, {
    id: child.id,
    classRoomId: child.classRoom?.id ?? null,
  });
  if (!allowed) {
    throw new Error("Forbidden");
  }

  const attendances = await prisma.attendance.findMany({
    where: { childId },
    include: { declarationDays: declarationDayInclude },
    orderBy: { date: "desc" },
    take: 100,
  });

  return { child, attendances };
}
