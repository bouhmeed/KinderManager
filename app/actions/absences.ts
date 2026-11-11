"use server";

import { prisma } from "@/lib/prisma";
import type {
  AbsenceStatus,
  AttendanceStatus,
} from "@/generated/prisma/enums";
import { requireAuth } from "@/lib/auth";
import {
  getEducatorClassRoomIds,
  getParentChildIds,
} from "@/lib/permissions";
import { parseDay, todayTunis, eachDay } from "@/lib/dates";
import {
  recomputeDeclarationStatus,
  findOverlappingDeclarationDates,
  cleanupAutoAttendance,
} from "@/lib/absence-utils";

const MAX_DECLARATION_DAYS = 92;

const declarationInclude = {
  child: {
    include: {
      classRoom: { select: { id: true, name: true } },
    },
  },
  declaredBy: { select: { id: true, name: true } },
  reviewer: { select: { id: true, name: true } },
  days: {
    orderBy: { date: "asc" as const },
    include: {
      attendance: {
        select: {
          id: true,
          status: true,
          arrivalTime: true,
          departureTime: true,
        },
      },
      verifier: { select: { id: true, name: true } },
    },
  },
} as const;

async function canAccessDeclaration(
  user: { id: number; role: string },
  declaration: {
    declaredByUserId: number;
    childId: number;
    child: { classRoomId: number | null };
  }
): Promise<boolean> {
  if (user.role === "ADMIN") {
    return true;
  }
  if (user.role === "PARENT") {
    if (declaration.declaredByUserId === user.id) {
      return true;
    }
    const childIds = await getParentChildIds(user.id);
    return childIds.includes(declaration.childId);
  }
  if (user.role === "EDUCATOR") {
    const classRoomId = declaration.child.classRoomId;
    if (!classRoomId) {
      return false;
    }
    const allowed = await getEducatorClassRoomIds(user.id);
    return allowed.includes(classRoomId);
  }
  return false;
}

export async function getAbsenceDeclarations(filters: {
  childName?: string;
  status?: string;
} = {}) {
  const user = await requireAuth();

  let scopeWhere: Record<string, unknown> = {};
  if (user.role === "EDUCATOR") {
    const classRoomIds = await getEducatorClassRoomIds(user.id);
    scopeWhere = {
      OR: [
        { declaredByUserId: user.id },
        { child: { classRoomId: { in: classRoomIds } } },
      ],
    };
  } else if (user.role === "PARENT") {
    const childIds = await getParentChildIds(user.id);
    scopeWhere = {
      OR: [
        { declaredByUserId: user.id },
        { childId: { in: childIds } },
      ],
    };
  }

  const declarations = await prisma.absenceDeclaration.findMany({
    where: {
      ...scopeWhere,
      ...(filters.status
        ? { status: filters.status as AbsenceStatus }
        : {}),
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
    },
    include: declarationInclude,
    orderBy: { id: "desc" },
    take: 200,
  });

  return declarations;
}

export async function getAbsenceDeclaration(id: number) {
  const user = await requireAuth();

  if (!Number.isInteger(id)) {
    throw new Error("Paramètres invalides");
  }

  const declaration = await prisma.absenceDeclaration.findUnique({
    where: { id },
    include: declarationInclude,
  });

  if (!declaration) {
    throw new Error("Déclaration non trouvée");
  }

  const allowed = await canAccessDeclaration(user, declaration);
  if (!allowed) {
    throw new Error("Forbidden");
  }

  return declaration;
}

export async function getDeclarableChildren() {
  const user = await requireAuth();

  const select = {
    id: true,
    firstName: true,
    lastName: true,
    birthDate: true,
    classRoom: { select: { id: true, name: true } },
  } as const;

  if (user.role === "PARENT") {
    const childIds = await getParentChildIds(user.id);
    return prisma.child.findMany({
      where: { id: { in: childIds } },
      orderBy: { lastName: "asc" },
      select,
    });
  }

  if (user.role === "EDUCATOR") {
    const classRoomIds = await getEducatorClassRoomIds(user.id);
    if (classRoomIds.length === 0) {
      return [];
    }
    return prisma.child.findMany({
      where: { classRoomId: { in: classRoomIds } },
      orderBy: { lastName: "asc" },
      select,
    });
  }

  if (user.role === "ADMIN") {
    return prisma.child.findMany({
      orderBy: { lastName: "asc" },
      select,
    });
  }

  return [];
}

async function assertCanDeclareForChild(
  user: { id: number; role: string },
  childId: number
): Promise<{ classRoomId: number | null } | { error: string }> {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { id: true, classRoomId: true },
  });
  if (!child) {
    return { error: "Enfant non trouvé" };
  }

  if (user.role === "PARENT") {
    const childIds = await getParentChildIds(user.id);
    if (!childIds.includes(childId)) {
      return {
        error: "Vous ne pouvez déclarer d'absence que pour vos enfants",
      };
    }
  } else if (user.role === "EDUCATOR") {
    if (!child.classRoomId) {
      return { error: "Enfant sans classe assignée" };
    }
    const allowed = await getEducatorClassRoomIds(user.id);
    if (!allowed.includes(child.classRoomId)) {
      return {
        error:
          "Vous ne pouvez déclarer une absence que pour les enfants de vos classes",
      };
    }
  } else if (user.role !== "ADMIN") {
    return { error: "Action non autorisée" };
  }

  return { classRoomId: child.classRoomId };
}

export async function createAbsenceDeclaration(formData: FormData) {
  const user = await requireAuth();
  if (
    user.role !== "PARENT" &&
    user.role !== "ADMIN" &&
    user.role !== "EDUCATOR"
  ) {
    return { error: "Action non autorisée" };
  }

  const childId = parseInt(formData.get("childId") as string);
  const startDate = parseDay((formData.get("startDate") as string) || "");
  const endDate = parseDay((formData.get("endDate") as string) || "");
  const reason = ((formData.get("reason") as string) || "").trim() || null;
  const description =
    ((formData.get("description") as string) || "").trim() || null;

  if (!Number.isInteger(childId) || !startDate || !endDate) {
    return { error: "Paramètres invalides" };
  }
  if (startDate > endDate) {
    return { error: "La date de début doit être avant la date de fin" };
  }

  const dates = eachDay(startDate, endDate);
  if (dates.length > MAX_DECLARATION_DAYS) {
    return {
      error: `La période ne peut pas dépasser ${MAX_DECLARATION_DAYS} jours`,
    };
  }

  const childCheck = await assertCanDeclareForChild(user, childId);
  if ("error" in childCheck) {
    return { error: childCheck.error };
  }

  // Prevent overlapping active declarations (PENDING or CONFIRMED days)
  const overlaps = await findOverlappingDeclarationDates(childId, dates);
  if (overlaps.length > 0) {
    const first = overlaps[0].toLocaleDateString("fr-FR");
    return {
      error: `Une déclaration active existe déjà pour cet enfant à partir du ${first}`,
    };
  }

  const declaration = await prisma.$transaction(async (tx) => {
    const decl = await tx.absenceDeclaration.create({
      data: {
        childId,
        declaredByUserId: user.id,
        source: user.role === "PARENT" ? "PARENT" : "STAFF",
        reason,
        description,
        status: "PENDING",
        startDate,
        endDate,
      },
    });

    for (const date of dates) {
      // Create the attendance row if missing; never overwrite an existing one.
      const attendance = await tx.attendance.upsert({
        where: { childId_date: { childId, date } },
        create: {
          childId,
          date,
          status: "ABSENT_DECLARED",
          recordedBy: user.id,
        },
        update: {},
      });

      await tx.absenceDeclarationDay.create({
        data: {
          declarationId: decl.id,
          attendanceId: attendance.id,
          date,
          status: "PENDING",
        },
      });
    }

    return decl;
  });

  return { success: true, declarationId: declaration.id };
}

// Educator/admin verifies a single declaration day.
// action: "CONFIRMED" (child absent) or "NOT_APPLICABLE" (child present / day cancelled)
export async function verifyDeclarationDay(
  dayId: number,
  action: "CONFIRMED" | "NOT_APPLICABLE",
  note?: string
) {
  const user = await requireAuth();
  if (user.role !== "ADMIN" && user.role !== "EDUCATOR") {
    return { error: "Action non autorisée" };
  }
  if (
    !Number.isInteger(dayId) ||
    (action !== "CONFIRMED" && action !== "NOT_APPLICABLE")
  ) {
    return { error: "Paramètres invalides" };
  }

  const day = await prisma.absenceDeclarationDay.findUnique({
    where: { id: dayId },
    include: {
      declaration: { include: { child: { select: { classRoomId: true } } } },
      attendance: { select: { id: true, status: true } },
    },
  });
  if (!day) {
    return { error: "Jour de déclaration non trouvé" };
  }

  if (user.role === "EDUCATOR") {
    const classRoomId = day.declaration.child.classRoomId;
    if (!classRoomId) {
      return { error: "Action non autorisée" };
    }
    const allowed = await getEducatorClassRoomIds(user.id);
    if (!allowed.includes(classRoomId)) {
      return { error: "Action non autorisée" };
    }
  }

  const trimmedNote = (note || "").trim() || null;

  await prisma.$transaction(async (tx) => {
    await tx.absenceDeclarationDay.update({
      where: { id: dayId },
      data: {
        status: action,
        note: trimmedNote,
        verifiedBy: user.id,
        verifiedAt: new Date(),
      },
    });

    // Sync the linked attendance record + write history on change.
    const attendance = await tx.attendance.findUnique({
      where: { id: day.attendanceId },
    });
    if (attendance) {
      let newStatus: AttendanceStatus | null = null;
      if (action === "CONFIRMED" && attendance.status !== "ABSENT_EXCUSED") {
        newStatus = "ABSENT_EXCUSED";
      } else if (
        action === "NOT_APPLICABLE" &&
        (attendance.status === "ABSENT_DECLARED" ||
          attendance.status === "ABSENT_EXCUSED" ||
          attendance.status === "ABSENT_UNEXCUSED")
      ) {
        newStatus = "PRESENT";
      }

      if (newStatus) {
        await tx.attendance.update({
          where: { id: attendance.id },
          data: { status: newStatus, recordedBy: user.id },
        });
        await tx.attendanceHistory.create({
          data: {
            childId: attendance.childId,
            attendanceId: attendance.id,
            date: attendance.date,
            oldStatus: attendance.status,
            newStatus,
            reason: trimmedNote ?? `Vérification déclaration #${day.declarationId}`,
            changedBy: user.id,
          },
        });
      }
    }

    await recomputeDeclarationStatus(tx, day.declarationId);
  });

  return { success: true };
}

// Cancels a declaration: creator only, while it still makes sense.
// Before the period: everything is removed.
// After it started: only future days are cancelled; past days are preserved.
export async function cancelAbsenceDeclaration(id: number) {
  const user = await requireAuth();
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }

  const declaration = await prisma.absenceDeclaration.findUnique({
    where: { id },
    include: { days: { select: { id: true, date: true, attendanceId: true } } },
  });
  if (!declaration) {
    return { error: "Déclaration non trouvée" };
  }
  if (declaration.declaredByUserId !== user.id) {
    return { error: "Vous ne pouvez annuler que vos propres déclarations" };
  }

  const today = todayTunis();
  const futureDays = declaration.days.filter((d) => d.date > today);
  const hasStarted = declaration.days.some((d) => d.date <= today);

  await prisma.$transaction(async (tx) => {
    if (!hasStarted) {
      // Whole period is in the future: remove everything.
      for (const d of declaration.days) {
        await cleanupAutoAttendance(tx, declaration.childId, d.date);
      }
      await tx.absenceDeclaration.delete({ where: { id } });
      return;
    }

    // Period started: cancel only future days, keep history.
    for (const d of futureDays) {
      await tx.absenceDeclarationDay.delete({ where: { id: d.id } });
      await cleanupAutoAttendance(tx, declaration.childId, d.date);
    }
    await recomputeDeclarationStatus(tx, id);
  });

  return { success: true };
}
