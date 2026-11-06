"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  getEducatorClassRoomIds,
  getParentChildIds,
} from "@/lib/permissions";
import { parseDay } from "@/lib/dates";

const DECLARATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

async function canAccessDeclaration(
  user: { id: number; role: string },
  declaration: {
    declaredByUserId: number;
    attendance: { childId: number; child: { classRoomId: number | null } };
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
    return childIds.includes(declaration.attendance.childId);
  }
  if (user.role === "EDUCATOR") {
    const classRoomId = declaration.attendance.child.classRoomId;
    if (!classRoomId) {
      return false;
    }
    const allowed = await getEducatorClassRoomIds(user.id);
    return allowed.includes(classRoomId);
  }
  return false;
}

const declarationInclude = {
  attendance: {
    include: {
      child: {
        include: {
          classRoom: { select: { id: true, name: true } },
        },
      },
    },
  },
  declaredBy: { select: { id: true, name: true } },
} as const;

export async function getAbsenceDeclarations(filters: {
  childName?: string;
  status?: string;
} = {}) {
  const user = await requireAuth();

  let scopeWhere: Record<string, unknown> = {};
  if (user.role === "EDUCATOR") {
    const classRoomIds = await getEducatorClassRoomIds(user.id);
    scopeWhere = {
      attendance: { child: { classRoomId: { in: classRoomIds } } },
    };
  } else if (user.role === "PARENT") {
    const childIds = await getParentChildIds(user.id);
    scopeWhere = {
      OR: [
        { declaredByUserId: user.id },
        { attendance: { childId: { in: childIds } } },
      ],
    };
  }

  const declarations = await prisma.absenceDeclaration.findMany({
    where: {
      ...scopeWhere,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.childName
        ? {
            attendance: {
              child: {
                OR: [
                  { firstName: { contains: filters.childName } },
                  { lastName: { contains: filters.childName } },
                ],
              },
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

  if (user.role === "PARENT") {
    const childIds = await getParentChildIds(user.id);
    return prisma.child.findMany({
      where: { id: { in: childIds } },
      orderBy: { lastName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        classRoom: { select: { id: true, name: true } },
      },
    });
  }

  if (user.role === "ADMIN") {
    return prisma.child.findMany({
      orderBy: { lastName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        classRoom: { select: { id: true, name: true } },
      },
    });
  }

  return [];
}

export async function createAbsenceDeclaration(formData: FormData) {
  const user = await requireAuth();

  if (user.role !== "PARENT" && user.role !== "ADMIN") {
    return { error: "Action non autorisée" };
  }

  const childIdRaw = formData.get("childId") as string;
  const dateRaw = formData.get("date") as string;
  const reason = (formData.get("reason") as string) || null;
  const description = (formData.get("description") as string) || null;
  const expectedReturnRaw = formData.get("expectedReturnDate") as string;

  const childId = parseInt(childIdRaw);
  const date = parseDay(dateRaw);
  const expectedReturnDate = expectedReturnRaw
    ? parseDay(expectedReturnRaw)
    : null;

  if (!Number.isInteger(childId) || !date) {
    return { error: "Paramètres invalides" };
  }
  if (expectedReturnRaw && !expectedReturnDate) {
    return { error: "Date de retour invalide" };
  }

  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { id: true },
  });

  if (!child) {
    return { error: "Enfant non trouvé" };
  }

  if (user.role === "PARENT") {
    const childIds = await getParentChildIds(user.id);
    if (!childIds.includes(childId)) {
      return { error: "Vous ne pouvez déclarer d'absence que pour vos enfants" };
    }
  }

  const existingAttendance = await prisma.attendance.findUnique({
    where: { childId_date: { childId, date } },
    include: { absenceDeclaration: { select: { id: true } } },
  });

  if (existingAttendance?.absenceDeclaration) {
    return {
      error: "Une déclaration d'absence existe déjà pour cet enfant à cette date",
    };
  }

  const declaration = await prisma.$transaction(async (tx) => {
    const attendance = await tx.attendance.upsert({
      where: { childId_date: { childId, date } },
      create: {
        childId,
        date,
        status: "ABSENT_DECLARED",
        recordedBy: user.id,
      },
      update: {
        status: "ABSENT_DECLARED",
        recordedBy: user.id,
      },
    });

    return tx.absenceDeclaration.create({
      data: {
        attendanceId: attendance.id,
        reason,
        description,
        declaredByUserId: user.id,
        source: user.role === "ADMIN" ? "STAFF" : "PARENT",
        status: "PENDING",
        expectedReturnDate,
      },
    });
  });

  return { success: true, declarationId: declaration.id };
}

export async function updateAbsenceDeclarationStatus(
  id: number,
  status: string
) {
  const user = await requireAuth();

  if (user.role !== "ADMIN") {
    return { error: "Action réservée à l'administrateur" };
  }

  if (
    !Number.isInteger(id) ||
    !DECLARATION_STATUSES.includes(status as (typeof DECLARATION_STATUSES)[number])
  ) {
    return { error: "Paramètres invalides" };
  }

  const declaration = await prisma.absenceDeclaration.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!declaration) {
    return { error: "Déclaration non trouvée" };
  }

  await prisma.absenceDeclaration.update({
    where: { id },
    data: { status },
  });

  return { success: true };
}
