import { prisma } from "./prisma";

export type SessionUser = { id: number; role: string };

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

  if (!profile?.isActive) {
    return [];
  }

  return profile.classRooms.map((a) => a.classRoomId);
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

// ---------- Reusable access guards ----------
//
// Two families:
// - canAccess*  : boolean checks, read-oriented (PARENT allowed where
//                 the child's own data is concerned).
// - assert*Access: throwing guards for server actions / writes.
//                 Parents are rejected unless explicitly allowed.

// Read access to a class room. Parents never get class-level access;
// they go through their children.
export async function canAccessClassRoom(
  user: SessionUser,
  classRoomId: number
): Promise<boolean> {
  if (user.role === "ADMIN") {
    return true;
  }
  if (user.role === "EDUCATOR") {
    const allowed = await getEducatorClassRoomIds(user.id);
    return allowed.includes(classRoomId);
  }
  return false;
}

// Read access to a child record, scoped by role:
// ADMIN -> all, EDUCATOR -> children of assigned class rooms,
// PARENT -> own children only.
export async function canAccessChild(
  user: SessionUser,
  child: { id: number; classRoomId: number | null }
): Promise<boolean> {
  if (user.role === "ADMIN") {
    return true;
  }
  if (user.role === "EDUCATOR") {
    if (!child.classRoomId) {
      return false;
    }
    const allowed = await getEducatorClassRoomIds(user.id);
    return allowed.includes(child.classRoomId);
  }
  if (user.role === "PARENT") {
    const childIds = await getParentChildIds(user.id);
    return childIds.includes(child.id);
  }
  return false;
}

// Write access to a class room (staff only). Throws "Forbidden".
export async function assertClassRoomAccess(
  user: SessionUser,
  classRoomId: number
): Promise<void> {
  if (user.role === "PARENT") {
    throw new Error("Forbidden");
  }
  if (!(await canAccessClassRoom(user, classRoomId))) {
    throw new Error("Forbidden");
  }
}

// Write access to a child (staff only). Fetches the child and throws
// "Forbidden" / "Enfant non trouvé"-style errors are left to callers;
// this only enforces role scope.
export async function assertChildAccess(
  user: SessionUser,
  child: { id: number; classRoomId: number | null }
): Promise<void> {
  if (user.role === "PARENT") {
    throw new Error("Forbidden");
  }
  if (!(await canAccessChild(user, child))) {
    throw new Error("Forbidden");
  }
}
