"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";
import {
  educatorCreateSchema,
  educatorUpdateSchema,
} from "@/lib/validations";

export async function getEducators() {
  await requireRole("ADMIN");

  const educators = await prisma.user.findMany({
    where: { role: "EDUCATOR" },
    include: {
      educatorProfile: true,
    },
    orderBy: { name: "asc" },
  });

  return educators;
}

export async function getEducator(id: number) {
  await requireRole("ADMIN");

  const educator = await prisma.user.findUnique({
    where: { id },
    include: {
      educatorProfile: {
        include: {
          classRooms: {
            include: {
              classRoom: true,
            },
          },
        },
      },
    },
  });

  if (!educator || educator.role !== "EDUCATOR") {
    throw new Error("Éducateur non trouvé");
  }

  return educator;
}

export async function createEducator(formData: FormData) {
  await requireRole("ADMIN");

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  const validation = educatorCreateSchema.safeParse({
    name,
    email,
    phone,
    password,
  });

  if (!validation.success) {
    return {
      error: validation.error.issues[0].message,
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: validation.data.email },
  });

  if (existingUser) {
    return {
      error: "Cet email est déjà utilisé",
    };
  }

  const passwordHash = await hashPassword(validation.data.password);

  const educator = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: validation.data.name,
        email: validation.data.email,
        passwordHash,
        role: "EDUCATOR",
        isActive: true,
      },
    });

    await tx.educatorProfile.create({
      data: {
        userId: user.id,
        phone: validation.data.phone,
      },
    });

    return user;
  });

  return { success: true, educator };
}

export async function updateEducator(id: number, formData: FormData) {
  await requireRole("ADMIN");

  const educator = await prisma.user.findUnique({
    where: { id },
    include: { educatorProfile: true },
  });

  if (!educator || educator.role !== "EDUCATOR") {
    return {
      error: "Éducateur non trouvé",
    };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const isActive = formData.get("isActive") === "true";
  const password = formData.get("password") as string;

  const validation = educatorUpdateSchema.safeParse({
    name,
    email,
    phone,
    isActive,
    password: password || undefined,
  });

  if (!validation.success) {
    return {
      error: validation.error.issues[0].message,
    };
  }

  if (validation.data.email !== educator.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: validation.data.email },
    });

    if (existingUser) {
      return {
        error: "Cet email est déjà utilisé",
      };
    }
  }

  const data: {
    name: string;
    email: string;
    isActive: boolean;
    passwordHash?: string;
  } = {
    name: validation.data.name,
    email: validation.data.email,
    isActive: validation.data.isActive,
  };

  if (validation.data.password) {
    data.passwordHash = await hashPassword(validation.data.password);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data,
    });

    await tx.educatorProfile.upsert({
      where: { userId: id },
      update: { phone: validation.data.phone },
      create: { userId: id, phone: validation.data.phone },
    });
  });

  return { success: true };
}

export async function assignEducatorToClassRoom(
  educatorProfileId: number,
  classRoomId: number
) {
  await requireRole("ADMIN");

  const [profile, classRoom] = await Promise.all([
    prisma.educatorProfile.findUnique({ where: { id: educatorProfileId } }),
    prisma.classRoom.findUnique({ where: { id: classRoomId } }),
  ]);

  if (!profile) {
    return { error: "Profil éducateur non trouvé" };
  }
  if (!classRoom) {
    return { error: "Classe non trouvée" };
  }

  const existing = await prisma.educatorClassRoom.findUnique({
    where: {
      educatorId_classRoomId: {
        educatorId: educatorProfileId,
        classRoomId,
      },
    },
  });

  if (existing) {
    return { error: "Cet éducateur est déjà assigné à cette classe" };
  }

  await prisma.educatorClassRoom.create({
    data: {
      educatorId: educatorProfileId,
      classRoomId,
    },
  });

  return { success: true };
}

export async function removeEducatorFromClassRoom(
  educatorProfileId: number,
  classRoomId: number
) {
  await requireRole("ADMIN");

  const result = await prisma.educatorClassRoom.deleteMany({
    where: {
      educatorId: educatorProfileId,
      classRoomId,
    },
  });

  if (result.count === 0) {
    return { error: "Aucune assignation trouvée" };
  }

  return { success: true };
}
