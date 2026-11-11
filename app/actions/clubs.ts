"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getParentChildIds } from "@/lib/permissions";

async function notifyUser(userId: number | null, message: string, type: string, href: string) {
  if (!userId) return;
  const existing = await prisma.notification.findFirst({
    where: { userId, type, href, status: "UNREAD" },
  });
  if (existing) return;
  await prisma.notification.create({
    data: { userId, message, type, href, status: "UNREAD" },
  });
}

async function parentUserIdsForChild(childId: number): Promise<number[]> {
  const links = await prisma.childGuardian.findMany({
    where: { childId },
    include: { guardian: { select: { userId: true } } },
  });
  return links.map((l) => l.guardian.userId).filter((x): x is number => x != null);
}

// Parent requests enrollment for own child in a CLUB activity.
export async function requestEnrollment(childId: number, activityId: number) {
  const user = await requireAuth();
  if (user.role !== "PARENT") return { error: "Action réservée aux parents" };
  const childIds = await getParentChildIds(user.id);
  if (!childIds.includes(childId)) return { error: "Enfant non autorisé" };

  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity || activity.category !== "CLUB" || !activity.isActive) {
    return { error: "Club introuvable" };
  }
  const existing = await prisma.clubEnrollment.findUnique({
    where: { childId_activityId: { childId, activityId } },
  });
  if (existing && existing.status !== "REJECTED" && existing.status !== "CANCELLED") {
    return { error: "Une demande existe déjà pour ce club" };
  }

  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { firstName: true, lastName: true, classRoomId: true },
  });

  await prisma.clubEnrollment.upsert({
    where: { childId_activityId: { childId, activityId } },
    create: { childId, activityId, status: "PENDING", requestedBy: user.id },
    update: { status: "PENDING", requestedBy: user.id, decidedBy: null, decidedAt: null, decisionNote: null },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  for (const a of admins) {
    await notifyUser(
      a.id,
      `Nouvelle demande d'inscription au club « ${activity.title} » pour ${child?.firstName} ${child?.lastName}.`,
      "CLUB_ENROLLMENT_REQUEST",
      "/clubs"
    );
  }
  if (child?.classRoomId) {
    const assignments = await prisma.educatorClassRoom.findMany({
      where: { classRoomId: child.classRoomId },
      include: { educator: { select: { userId: true } } },
    });
    for (const a of assignments) {
      await notifyUser(
        a.educator.userId,
        `Demande d'inscription au club « ${activity.title} » pour ${child.firstName} ${child.lastName} (en attente de décision admin).`,
        "CLUB_ENROLLMENT_REQUEST",
        "/seances"
      );
    }
  }
  return { success: true };
}

export async function cancelEnrollmentRequest(enrollmentId: number) {
  const user = await requireAuth();
  const e = await prisma.clubEnrollment.findUnique({ where: { id: enrollmentId } });
  if (!e) return { error: "Inscription introuvable" };
  if (e.requestedBy !== user.id && user.role !== "ADMIN") {
    return { error: "Action non autorisée" };
  }
  if (e.status !== "PENDING") return { error: "Seules les demandes en attente peuvent être annulées" };
  await prisma.clubEnrollment.update({ where: { id: enrollmentId }, data: { status: "CANCELLED" } });
  return { success: true };
}

// Admin: direct enroll (APPROVED immediately).
export async function adminEnroll(childId: number, activityId: number) {
  const user = await requireAuth();
  if (user.role !== "ADMIN") return { error: "Réservé à l'administrateur" };
  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity || activity.category !== "CLUB") return { error: "Club introuvable" };
  await prisma.clubEnrollment.upsert({
    where: { childId_activityId: { childId, activityId } },
    create: { childId, activityId, status: "APPROVED", requestedBy: user.id, decidedBy: user.id, decidedAt: new Date() },
    update: { status: "APPROVED", decidedBy: user.id, decidedAt: new Date() },
  });
  for (const pid of await parentUserIdsForChild(childId)) {
    await notifyUser(pid, `Votre enfant est inscrit au club « ${activity.title} ».`, "CLUB_ENROLLMENT_APPROVED", "/calendrier");
  }
  return { success: true };
}

export async function decideEnrollment(enrollmentId: number, approve: boolean, note?: string) {
  const user = await requireAuth();
  if (user.role !== "ADMIN") return { error: "Réservé à l'administrateur" };
  const e = await prisma.clubEnrollment.findUnique({
    where: { id: enrollmentId },
    include: { activity: { select: { title: true } }, child: { select: { firstName: true, lastName: true } } },
  });
  if (!e || e.status !== "PENDING") return { error: "Demande introuvable ou déjà traitée" };

  await prisma.clubEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: approve ? "APPROVED" : "REJECTED",
      decidedBy: user.id,
      decidedAt: new Date(),
      decisionNote: note?.trim() || null,
    },
  });
  for (const pid of await parentUserIdsForChild(e.childId)) {
    await notifyUser(
      pid,
      approve
        ? `Inscription au club « ${e.activity.title} » approuvée pour ${e.child.firstName}.`
        : `Inscription au club « ${e.activity.title} » refusée pour ${e.child.firstName}.${note ? ` Motif : ${note}` : ""}`,
      approve ? "CLUB_ENROLLMENT_APPROVED" : "CLUB_ENROLLMENT_REJECTED",
      "/calendrier"
    );
  }
  return { success: true };
}

export async function cancelEnrollment(enrollmentId: number) {
  const user = await requireAuth();
  if (user.role !== "ADMIN") return { error: "Réservé à l'administrateur" };
  const e = await prisma.clubEnrollment.findUnique({ where: { id: enrollmentId } });
  if (!e || e.status === "CANCELLED") return { error: "Inscription introuvable" };
  await prisma.clubEnrollment.update({ where: { id: enrollmentId }, data: { status: "CANCELLED" } });
  return { success: true };
}

export async function getPendingEnrollments() {
  const user = await requireAuth();
  if (user.role !== "ADMIN") return [];
  return prisma.clubEnrollment.findMany({
    where: { status: "PENDING" },
    include: {
      child: { select: { id: true, firstName: true, lastName: true, classRoom: { select: { name: true } } } },
      activity: { select: { id: true, title: true, color: true } },
      requester: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getChildEnrollments(childId: number) {
  const user = await requireAuth();
  const allowed =
    user.role === "ADMIN" ||
    (user.role === "PARENT" && (await getParentChildIds(user.id)).includes(childId));
  if (!allowed) return [];
  return prisma.clubEnrollment.findMany({
    where: { childId },
    include: { activity: { select: { id: true, title: true, category: true, color: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEnrollmentsForActivity(activityId: number) {
  const user = await requireAuth();
  const enrollments = await prisma.clubEnrollment.findMany({
    where: { activityId },
    include: {
      child: { select: { id: true, firstName: true, lastName: true, classRoomId: true, classRoom: { select: { name: true } } } },
      requester: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { child: { lastName: "asc" } }],
  });
  if (user.role === "ADMIN") return enrollments;
  if (user.role === "EDUCATOR") {
    const { getEducatorClassRoomIds } = await import("@/lib/permissions");
    const rooms = await getEducatorClassRoomIds(user.id);
    return enrollments.filter((e) => e.child.classRoomId != null && rooms.includes(e.child.classRoomId));
  }
  return [];
}

export async function getClubActivities() {
  await requireAuth();
  return prisma.activity.findMany({
    where: { category: "CLUB", isActive: true },
    include: {
      clubEnrollments: {
        where: { status: "APPROVED" },
        include: { child: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
    orderBy: { title: "asc" },
  });
}
