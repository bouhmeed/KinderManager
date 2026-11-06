"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  getEducatorClassRoomIds,
  getParentChildIds,
} from "@/lib/permissions";

const REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
const REQUEST_TYPES = [
  "Sortie anticipée",
  "Documents",
  "Réunion",
  "Autre",
] as const;

// ============================================================
// ANNOUNCEMENTS
// ============================================================

export async function getAnnouncements() {
  await requireAuth();
  return prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function createAnnouncement(formData: FormData) {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    return { error: "Action réservée à l'administrateur" };
  }

  const title = ((formData.get("title") as string) || "").trim();
  const content = ((formData.get("content") as string) || "").trim();
  if (!title || !content) {
    return { error: "Le titre et le contenu sont obligatoires" };
  }

  await prisma.announcement.create({ data: { title, content } });
  return { success: true };
}

export async function deleteAnnouncement(id: number) {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    return { error: "Action réservée à l'administrateur" };
  }
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  await prisma.announcement.delete({ where: { id } });
  return { success: true };
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function getMyNotifications() {
  const user = await requireAuth();
  return prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function markNotificationRead(id: number) {
  const user = await requireAuth();
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!notification || notification.userId !== user.id) {
    return { error: "Notification non trouvée" };
  }
  await prisma.notification.update({
    where: { id },
    data: { status: "READ" },
  });
  return { success: true };
}

export async function getAllUsers() {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });
}

export async function sendNotification(formData: FormData) {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    return { error: "Action réservée à l'administrateur" };
  }

  const targetUserId = parseInt(formData.get("userId") as string);
  const message = ((formData.get("message") as string) || "").trim();

  if (!Number.isInteger(targetUserId) || !message) {
    return { error: "Paramètres invalides" };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, isActive: true },
  });
  if (!target || !target.isActive) {
    return { error: "Utilisateur introuvable" };
  }

  await prisma.notification.create({
    data: { userId: targetUserId, message, status: "UNREAD" },
  });
  return { success: true };
}

// ============================================================
// DEMANDES (Requests)
// ============================================================

async function getEducatorVisibleChildIds(userId: number): Promise<number[]> {
  const classRoomIds = await getEducatorClassRoomIds(userId);
  if (classRoomIds.length === 0) {
    return [];
  }
  const children = await prisma.child.findMany({
    where: { classRoomId: { in: classRoomIds } },
    select: { id: true },
  });
  return children.map((c) => c.id);
}

export async function getRequests(filters: { status?: string } = {}) {
  const user = await requireAuth();

  let scopeWhere: Record<string, unknown> = {};
  if (user.role === "PARENT") {
    const childIds = await getParentChildIds(user.id);
    scopeWhere = {
      OR: [{ createdBy: user.id }, { childId: { in: childIds } }],
    };
  } else if (user.role === "EDUCATOR") {
    const childIds = await getEducatorVisibleChildIds(user.id);
    scopeWhere = { childId: { in: childIds } };
  } else {
    if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }
  }

  return prisma.request.findMany({
    where: {
      ...scopeWhere,
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: {
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          classRoom: { select: { name: true } },
        },
      },
      creator: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getRequest(id: number) {
  const user = await requireAuth();
  if (!Number.isInteger(id)) {
    throw new Error("Paramètres invalides");
  }

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          classRoom: { select: { id: true, name: true } },
        },
      },
      creator: { select: { id: true, name: true, role: true } },
    },
  });
  if (!request) {
    throw new Error("Demande non trouvée");
  }

  if (user.role === "PARENT") {
    const childIds = await getParentChildIds(user.id);
    const allowed =
      request.createdBy === user.id ||
      (request.childId !== null && childIds.includes(request.childId));
    if (!allowed) {
      throw new Error("Forbidden");
    }
  } else if (user.role === "EDUCATOR") {
    if (!request.childId) {
      throw new Error("Forbidden");
    }
    const childIds = await getEducatorVisibleChildIds(user.id);
    if (!childIds.includes(request.childId)) {
      throw new Error("Forbidden");
    }
  } else if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  return request;
}

export async function getRequestableChildren() {
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
        classRoom: { select: { name: true } },
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
        classRoom: { select: { name: true } },
      },
    });
  }
  return [];
}

export async function createRequest(formData: FormData) {
  const user = await requireAuth();
  if (user.role !== "PARENT" && user.role !== "ADMIN") {
    return { error: "Action non autorisée" };
  }

  const childIdRaw = formData.get("childId") as string;
  const type = ((formData.get("type") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim();

  const childId = childIdRaw ? parseInt(childIdRaw) : null;

  if (!type || !description || (childIdRaw && !Number.isInteger(childId))) {
    return { error: "Paramètres invalides" };
  }
  if (
    type &&
    !REQUEST_TYPES.includes(type as (typeof REQUEST_TYPES)[number])
  ) {
    return { error: "Type de demande invalide" };
  }

  if (childId !== null) {
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
        return { error: "Vous ne pouvez créer une demande que pour vos enfants" };
      }
    }
  }

  const request = await prisma.request.create({
    data: {
      childId,
      createdBy: user.id,
      type,
      description,
      status: "PENDING",
    },
  });

  return { success: true, requestId: request.id };
}

export async function updateRequestStatus(id: number, status: string) {
  const user = await requireAuth();
  if (user.role !== "ADMIN" && user.role !== "EDUCATOR") {
    return { error: "Action non autorisée" };
  }

  if (
    !Number.isInteger(id) ||
    !REQUEST_STATUSES.includes(status as (typeof REQUEST_STATUSES)[number])
  ) {
    return { error: "Paramètres invalides" };
  }

  const request = await prisma.request.findUnique({
    where: { id },
    include: { child: { select: { classRoomId: true } } },
  });
  if (!request) {
    return { error: "Demande non trouvée" };
  }

  if (user.role === "EDUCATOR") {
    if (!request.childId || !request.child?.classRoomId) {
      return { error: "Action non autorisée" };
    }
    const classRoomIds = await getEducatorClassRoomIds(user.id);
    if (!classRoomIds.includes(request.child.classRoomId)) {
      return { error: "Action non autorisée" };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.request.update({ where: { id }, data: { status } });
    await tx.notification.create({
      data: {
        userId: request.createdBy,
        message: `Votre demande #${request.id} a été ${
          status === "APPROVED" ? "approuvée" : status === "REJECTED" ? "rejetée" : "mise à jour"
        }.`,
        status: "UNREAD",
      },
    });
  });

  return { success: true };
}

// ============================================================
// MESSAGERIE
// ============================================================

export async function getMessageableUsers(childId?: number) {
  const user = await requireAuth();

  if (user.role === "ADMIN") {
    return prisma.user.findMany({
      where: { isActive: true, id: { not: user.id } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  if (user.role === "EDUCATOR") {
    const classRoomIds = await getEducatorClassRoomIds(user.id);
    const children = await prisma.child.findMany({
      where: { classRoomId: { in: classRoomIds } },
      select: { id: true },
    });
    const childIds = children.map((c) => c.id);

    const guardians = await prisma.childGuardian.findMany({
      where: { childId: { in: childIds } },
      select: { guardian: { select: { userId: true } } },
    });
    const parentUserIds = guardians
      .map((g) => g.guardian.userId)
      .filter((id): id is number => id !== null && id !== user.id);

    return prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: user.id },
        OR: [{ role: "ADMIN" }, { id: { in: [...new Set(parentUserIds)] } }],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  if (user.role === "PARENT") {
    const staff = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ["ADMIN", "EDUCATOR"] },
        id: { not: user.id },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    });

    if (childId) {
      const childIds = await getParentChildIds(user.id);
      if (!childIds.includes(childId)) {
        return staff;
      }
      const guardians = await prisma.childGuardian.findMany({
        where: { childId },
        select: { guardian: { select: { userId: true } } },
      });
      const coParentIds = guardians
        .map((g) => g.guardian.userId)
        .filter((id): id is number => id !== null && id !== user.id);

      if (coParentIds.length > 0) {
        const coParents = await prisma.user.findMany({
          where: { id: { in: [...new Set(coParentIds)] }, isActive: true },
          select: { id: true, name: true, email: true, role: true },
        });
        return [...staff, ...coParents];
      }
    }
    return staff;
  }

  return [];
}

export async function getMyConversations() {
  const user = await requireAuth();

  const participations = await prisma.conversationParticipant.findMany({
    where: { userId: user.id },
    select: { conversationId: true },
  });
  const conversationIds = participations.map((p) => p.conversationId);

  if (conversationIds.length === 0) {
    return [];
  }

  return prisma.conversation.findMany({
    where: { id: { in: conversationIds } },
    orderBy: { createdAt: "desc" },
    include: {
      child: {
        select: { id: true, firstName: true, lastName: true },
      },
      participants: {
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      },
      messages: {
        orderBy: { sentAt: "desc" },
        take: 1,
        include: { sender: { select: { name: true } } },
      },
    },
  });
}

export async function getConversation(id: number) {
  const user = await requireAuth();
  if (!Number.isInteger(id)) {
    throw new Error("Paramètres invalides");
  }

  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId: id, userId: user.id },
    },
  });
  if (!participant) {
    throw new Error("Forbidden");
  }

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id },
    include: {
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          classRoom: { select: { name: true } },
        },
      },
      participants: {
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      },
      messages: {
        orderBy: { sentAt: "asc" },
        take: 200,
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  });

  // Mark messages sent by others as read for this user view
  const unreadIds = conversation.messages
    .filter((m) => !m.isRead && m.senderId !== user.id)
    .map((m) => m.id);
  if (unreadIds.length > 0) {
    await prisma.message.updateMany({
      where: { id: { in: unreadIds } },
      data: { isRead: true },
    });
  }

  return { ...conversation, viewerId: user.id };
}

export async function createConversation(formData: FormData) {
  const user = await requireAuth();

  const childIdRaw = formData.get("childId") as string;
  const participantIdsRaw = formData.get("participantIds") as string;

  const childId = childIdRaw ? parseInt(childIdRaw) : null;

  let participantIds: number[];
  try {
    participantIds = JSON.parse(participantIdsRaw).map(Number);
  } catch {
    return { error: "Participants invalides" };
  }

  participantIds = [...new Set(participantIds)].filter(
    (id) => Number.isInteger(id) && id !== user.id
  );

  if (participantIds.length === 0) {
    return { error: "Sélectionnez au moins un participant" };
  }

  // Validate child access
  if (childId !== null) {
    if (user.role === "PARENT") {
      const childIds = await getParentChildIds(user.id);
      if (!childIds.includes(childId)) {
        return { error: "Enfant non autorisé" };
      }
    } else if (user.role === "EDUCATOR") {
      const child = await prisma.child.findUnique({
        where: { id: childId },
        select: { classRoomId: true },
      });
      if (!child?.classRoomId) {
        return { error: "Enfant non autorisé" };
      }
      const classRoomIds = await getEducatorClassRoomIds(user.id);
      if (!classRoomIds.includes(child.classRoomId)) {
        return { error: "Enfant non autorisé" };
      }
    }
  }

  // Validate participants are messageable
  const allowed = await getMessageableUsers(childId ?? undefined);
  const allowedIds = new Set(allowed.map((u) => u.id));
  const invalid = participantIds.filter((id) => !allowedIds.has(id));
  if (invalid.length > 0) {
    return { error: "Un ou plusieurs participants ne sont pas autorisés" };
  }

  const conversation = await prisma.conversation.create({
    data: {
      childId,
      participants: {
        create: [
          { userId: user.id },
          ...participantIds.map((userId) => ({ userId })),
        ],
      },
    },
  });

  return { success: true, conversationId: conversation.id };
}

export async function sendMessage(conversationId: number, content: string) {
  const user = await requireAuth();

  if (!Number.isInteger(conversationId)) {
    return { error: "Paramètres invalides" };
  }

  const text = (content || "").trim();
  if (!text || text.length > 5000) {
    return { error: "Message invalide" };
  }

  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId: user.id },
    },
  });
  if (!participant) {
    return { error: "Forbidden" };
  }

  await prisma.message.create({
    data: { conversationId, senderId: user.id, content: text },
  });

  return { success: true };
}
