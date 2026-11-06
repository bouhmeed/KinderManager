"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  getEducatorClassRoomIds,
  getParentChildIds,
} from "@/lib/permissions";
import { parseDay } from "@/lib/dates";

const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT_DECLARED",
  "ABSENT_UNEXCUSED",
  "LATE",
] as const;

type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

async function assertClassRoomAccess(
  user: { id: number; role: string },
  classRoomId: number
): Promise<void> {
  if (user.role === "PARENT") {
    throw new Error("Forbidden");
  }
  if (user.role === "EDUCATOR") {
    const allowed = await getEducatorClassRoomIds(user.id);
    if (!allowed.includes(classRoomId)) {
      throw new Error("Forbidden");
    }
  }
}

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
    include: {
      absenceDeclaration: {
        select: { id: true, status: true, reason: true },
      },
    },
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
      attendance: attendanceByChild.get(child.id) ?? null,
    })),
  };
}

export async function saveClassRoomAttendance(
  classRoomId: number,
  dateValue: string,
  records: {
    childId: number;
    status: string;
    arrivalTime?: string;
    departureTime?: string;
  }[]
) {
  const user = await requireAuth();
  await assertClassRoomAccess(user, classRoomId);

  const date = parseDay(dateValue);
  if (!date || !Array.isArray(records) || records.length === 0) {
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

  for (const record of records) {
    if (
      !Number.isInteger(record.childId) ||
      !classChildIds.has(record.childId) ||
      !ATTENDANCE_STATUSES.includes(record.status as AttendanceStatus)
    ) {
      return { error: "Enregistrement invalide" };
    }
  }

  const parseTime = (time?: string) => {
    if (!time) return null;
    const parsed = new Date(`${dateValue}T${time}`);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  await prisma.$transaction(
    records.map((record) =>
      prisma.attendance.upsert({
        where: {
          childId_date: {
            childId: record.childId,
            date,
          },
        },
        create: {
          childId: record.childId,
          date,
          status: record.status as AttendanceStatus,
          arrivalTime: parseTime(record.arrivalTime),
          departureTime: parseTime(record.departureTime),
          recordedBy: user.id,
        },
        update: {
          status: record.status as AttendanceStatus,
          arrivalTime: parseTime(record.arrivalTime),
          departureTime: parseTime(record.departureTime),
          recordedBy: user.id,
        },
      })
    )
  );

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
      absenceDeclaration: {
        select: { id: true, status: true, reason: true },
      },
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

  if (user.role === "EDUCATOR") {
    const allowed = await getEducatorClassRoomIds(user.id);
    const childClassRoomId = await prisma.child.findUnique({
      where: { id: childId },
      select: { classRoomId: true },
    });
    if (
      !childClassRoomId?.classRoomId ||
      !allowed.includes(childClassRoomId.classRoomId)
    ) {
      throw new Error("Forbidden");
    }
  } else if (user.role === "PARENT") {
    const childIds = await getParentChildIds(user.id);
    if (!childIds.includes(childId)) {
      throw new Error("Forbidden");
    }
  }

  const attendances = await prisma.attendance.findMany({
    where: { childId },
    include: {
      absenceDeclaration: {
        select: { id: true, status: true, reason: true },
      },
    },
    orderBy: { date: "desc" },
    take: 100,
  });

  return { child, attendances };
}
