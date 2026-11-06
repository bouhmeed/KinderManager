"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { classRoomSchema } from "@/lib/validations";

export async function getClassRooms() {
  await requireRole("ADMIN");

  const classRooms = await prisma.classRoom.findMany({
    include: {
      _count: {
        select: { children: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return classRooms;
}

export async function getClassRoom(id: number) {
  await requireRole("ADMIN");

  const classRoom = await prisma.classRoom.findUnique({
    where: { id },
    include: {
      children: {
        orderBy: { lastName: "asc" },
      },
      activities: {
        include: {
          activity: true,
        },
      },
      educators: {
        include: {
          educator: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: { children: true },
      },
    },
  });

  if (!classRoom) {
    throw new Error("Classe non trouvée");
  }

  return classRoom;
}

export async function createClassRoom(formData: FormData) {
  await requireRole("ADMIN");

  const name = formData.get("name") as string;
  const ageGroup = formData.get("ageGroup") as string;
  const capacity = formData.get("capacity") as string;

  const validation = classRoomSchema.safeParse({
    name,
    ageGroup,
    capacity,
  });

  if (!validation.success) {
    return {
      error: validation.error.issues[0].message,
    };
  }

  const classRoom = await prisma.classRoom.create({
    data: {
      name: validation.data.name,
      ageGroup: validation.data.ageGroup,
      capacity: validation.data.capacity,
    },
  });

  return { success: true, classRoom };
}

export async function updateClassRoom(id: number, formData: FormData) {
  await requireRole("ADMIN");

  const name = formData.get("name") as string;
  const ageGroup = formData.get("ageGroup") as string;
  const capacity = formData.get("capacity") as string;

  const validation = classRoomSchema.safeParse({
    name,
    ageGroup,
    capacity,
  });

  if (!validation.success) {
    return {
      error: validation.error.issues[0].message,
    };
  }

  const classRoom = await prisma.classRoom.update({
    where: { id },
    data: {
      name: validation.data.name,
      ageGroup: validation.data.ageGroup,
      capacity: validation.data.capacity,
    },
  });

  return { success: true, classRoom };
}

export async function getUnassignedChildren() {
  await requireRole("ADMIN");

  const children = await prisma.child.findMany({
    where: { classRoomId: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      enrollmentStatus: true,
    },
    orderBy: { lastName: "asc" },
  });

  return children;
}

export async function assignChildrenToClassRoom(
  classRoomId: number,
  childIds: number[]
) {
  await requireRole("ADMIN");

  if (
    !Number.isInteger(classRoomId) ||
    !Array.isArray(childIds) ||
    childIds.length === 0 ||
    !childIds.every((id) => Number.isInteger(id))
  ) {
    return { error: "Paramètres invalides" };
  }

  const classRoom = await prisma.classRoom.findUnique({
    where: { id: classRoomId },
  });

  if (!classRoom) {
    return { error: "Classe non trouvée" };
  }

  const uniqueIds = [...new Set(childIds)];
  const children = await prisma.child.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, classRoomId: true },
  });

  if (children.length !== uniqueIds.length) {
    return { error: "Un ou plusieurs enfants sont introuvables" };
  }

  const assignableIds = children
    .filter((child) => child.classRoomId === null)
    .map((child) => child.id);

  if (assignableIds.length === 0) {
    return { error: "Aucun enfant non assigné à enregistrer" };
  }

  await prisma.child.updateMany({
    where: { id: { in: assignableIds } },
    data: { classRoomId },
  });

  return { success: true, count: assignableIds.length };
}

export async function unassignChildFromClassRoom(childId: number) {
  await requireRole("ADMIN");

  if (!Number.isInteger(childId)) {
    return { error: "Paramètres invalides" };
  }

  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { id: true, classRoomId: true },
  });

  if (!child) {
    return { error: "Enfant non trouvé" };
  }

  await prisma.child.update({
    where: { id: childId },
    data: { classRoomId: null },
  });

  return { success: true };
}
