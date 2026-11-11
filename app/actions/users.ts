"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";

export async function getUsers() {
  const currentUser = await requireRole("ADMIN");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      guardianProfile: {
        select: { id: true, firstName: true, lastName: true },
      },
      educatorProfile: { select: { id: true, isActive: true } },
    },
  });

  return { users, currentUserId: currentUser.id };
}

export async function resetUserPassword(userId: number, formData: FormData) {
  const currentUser = await requireRole("ADMIN");

  if (!Number.isInteger(userId)) {
    return { error: "Paramètres invalides" };
  }

  const password = (formData.get("newPassword") as string) || "";
  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères" };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { error: "Utilisateur non trouvé" };
  }
  if (target.id === currentUser.id) {
    return {
      error:
        "Utilisez la déconnexion puis reconnectez-vous pour changer votre propre mot de passe",
    };
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await tx.session.deleteMany({ where: { userId } });
  });

  return { success: true };
}

export async function setUserActive(userId: number, isActive: boolean) {
  const currentUser = await requireRole("ADMIN");

  if (!Number.isInteger(userId)) {
    return { error: "Paramètres invalides" };
  }
  if (userId === currentUser.id) {
    return { error: "Vous ne pouvez pas désactiver votre propre compte" };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { error: "Utilisateur non trouvé" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { isActive },
    });
    if (!isActive) {
      await tx.session.deleteMany({ where: { userId } });
    }
    // Révoquer aussi l'accès éducateur quand le compte est désactivé
    if (target.role === "EDUCATOR") {
      await tx.educatorProfile.updateMany({
        where: { userId },
        data: { isActive },
      });
    }
  });

  return { success: true };
}
