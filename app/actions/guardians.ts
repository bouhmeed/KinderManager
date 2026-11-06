"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";
import { guardianSchema } from "@/lib/validations-children";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function validateAccountFields(
  email: string,
  password: string
): Promise<string | null> {
  if (!EMAIL_REGEX.test(email)) {
    return "Adresse email invalide";
  }
  if (password.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères";
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return "Un compte existe déjà avec cet email";
  }
  return null;
}

export async function getGuardians(searchQuery: string = "") {
  await requireRole("ADMIN");

  const guardians = await prisma.guardian.findMany({
    where: searchQuery
      ? {
          OR: [
            { firstName: { contains: searchQuery } },
            { lastName: { contains: searchQuery } },
            { email: { contains: searchQuery } },
          ],
        }
      : undefined,
    include: {
      children: {
        include: {
          child: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
        },
      },
    },
    orderBy: { lastName: "asc" },
  });

  return guardians;
}

export async function getGuardianOptions() {
  await requireRole("ADMIN");

  return prisma.guardian.findMany({
    select: { id: true, firstName: true, lastName: true, phone: true },
    orderBy: { lastName: "asc" },
  });
}

export async function getGuardian(id: number) {
  await requireRole("ADMIN");

  const guardian = await prisma.guardian.findUnique({
    where: { id },
    include: {
      children: {
        include: {
          child: {
            include: {
              classRoom: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
        },
      },
    },
  });

  if (!guardian) {
    throw new Error("Tuteur non trouvé");
  }

  return guardian;
}

export async function createGuardian(formData: FormData) {
  await requireRole("ADMIN");

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;

  const validation = guardianSchema.safeParse({
    firstName,
    lastName,
    phone,
    email: email || undefined,
  });

  if (!validation.success) {
    return {
      error: validation.error.issues[0].message,
    };
  }

  const wantsAccount = formData.get("createAccount") === "on";
  const accountEmail = ((formData.get("accountEmail") as string) || "").trim();
  const accountPassword = (formData.get("accountPassword") as string) || "";
  const accountName =
    ((formData.get("accountName") as string) || "").trim() ||
    `${validation.data.firstName} ${validation.data.lastName}`;

  if (wantsAccount) {
    const accountError = await validateAccountFields(
      accountEmail,
      accountPassword
    );
    if (accountError) {
      return { error: accountError };
    }
  }

  const passwordHash = wantsAccount
    ? await hashPassword(accountPassword)
    : null;

  const guardian = await prisma.$transaction(async (tx) => {
    const created = await tx.guardian.create({
      data: {
        firstName: validation.data.firstName,
        lastName: validation.data.lastName,
        phone: validation.data.phone,
        email: validation.data.email || null,
      },
    });

    if (wantsAccount && passwordHash) {
      const user = await tx.user.create({
        data: {
          name: accountName,
          email: accountEmail,
          passwordHash,
          role: "PARENT",
        },
      });
      await tx.guardian.update({
        where: { id: created.id },
        data: { userId: user.id },
      });
      created.userId = user.id;
    }

    return created;
  });

  return { success: true, guardian };
}

export async function createGuardianAccount(
  guardianId: number,
  formData: FormData
) {
  await requireRole("ADMIN");

  if (!Number.isInteger(guardianId)) {
    return { error: "Paramètres invalides" };
  }

  const guardian = await prisma.guardian.findUnique({
    where: { id: guardianId },
  });
  if (!guardian) {
    return { error: "Tuteur non trouvé" };
  }
  if (guardian.userId) {
    return { error: "Ce tuteur a déjà un compte lié" };
  }

  const email = ((formData.get("accountEmail") as string) || "").trim();
  const password = (formData.get("accountPassword") as string) || "";
  const name =
    ((formData.get("accountName") as string) || "").trim() ||
    `${guardian.firstName} ${guardian.lastName}`;

  const accountError = await validateAccountFields(email, password);
  if (accountError) {
    return { error: accountError };
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash, role: "PARENT" },
    });
    await tx.guardian.update({
      where: { id: guardianId },
      data: { userId: user.id },
    });
  });

  return { success: true };
}

export async function updateGuardian(id: number, formData: FormData) {
  await requireRole("ADMIN");

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;

  const validation = guardianSchema.safeParse({
    firstName,
    lastName,
    phone,
    email: email || undefined,
  });

  if (!validation.success) {
    return {
      error: validation.error.issues[0].message,
    };
  }

  const guardian = await prisma.guardian.update({
    where: { id },
    data: {
      firstName: validation.data.firstName,
      lastName: validation.data.lastName,
      phone: validation.data.phone,
      email: validation.data.email || null,
    },
  });

  return { success: true, guardian };
}

export async function deleteGuardian(id: number) {
  await requireRole("ADMIN");

  // Check if guardian has linked children
  const guardian = await prisma.guardian.findUnique({
    where: { id },
    include: {
      children: true,
    },
  });

  if (!guardian) {
    return {
      error: "Tuteur non trouvé",
    };
  }

  if (guardian.children.length > 0) {
    return {
      error: "Ce tuteur est lié à des enfants. Veuillez d'abord supprimer les liens.",
    };
  }

  await prisma.guardian.delete({
    where: { id },
  });

  return { success: true };
}
