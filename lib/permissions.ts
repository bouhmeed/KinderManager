import { prisma } from "./prisma";

export async function getEducatorClassRoomIds(
  userId: number
): Promise<number[]> {
  const profile = await prisma.educatorProfile.findUnique({
    where: { userId },
    include: {
      classRooms: {
        select: { classRoomId: true },
      },
    },
  });

  return profile?.classRooms.map((a) => a.classRoomId) ?? [];
}

export async function getParentChildIds(userId: number): Promise<number[]> {
  const guardian = await prisma.guardian.findUnique({
    where: { userId },
    include: {
      children: {
        select: { childId: true },
      },
    },
  });

  return guardian?.children.map((cg) => cg.childId) ?? [];
}
