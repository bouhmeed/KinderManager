"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, requireAuth, hashPassword } from "@/lib/auth";
import { getParentChildIds } from "@/lib/permissions";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import type {
  AllergySeverity,
  EnrollmentStatus,
} from "@/generated/prisma/enums";
import {
  childSchema,
  childIdentitySchema,
  guardianSchema,
  linkGuardianSchema,
} from "@/lib/validations-children";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLERGY_SEVERITIES = ["MILD", "MODERATE", "SEVERE"] as const;

const PHOTO_DIR = path.join(process.cwd(), "public", "uploads", "children");
const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const MAX_PHOTO_SIZE = 3 * 1024 * 1024;

async function saveChildPhoto(
  formData: FormData
): Promise<{ photo?: string; error?: string }> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return {};
  }
  const ext = PHOTO_TYPES[file.type];
  if (!ext) {
    return { error: "Format d'image non supporté (JPG, PNG, WebP ou GIF)" };
  }
  if (file.size > MAX_PHOTO_SIZE) {
    return { error: "Photo trop lourde (maximum 3 Mo)" };
  }
  const name = `${randomBytes(8).toString("hex")}${ext}`;
  await mkdir(PHOTO_DIR, { recursive: true });
  await writeFile(
    path.join(PHOTO_DIR, name),
    Buffer.from(await file.arrayBuffer())
  );
  return { photo: `/uploads/children/${name}` };
}

export async function getChildren(searchQuery: string = "") {
  await requireRole("ADMIN");

  const children = await prisma.child.findMany({
    where: searchQuery
      ? {
          OR: [
            { firstName: { contains: searchQuery } },
            { lastName: { contains: searchQuery } },
          ],
        }
      : undefined,
    include: {
      guardians: {
        include: {
          guardian: true,
        },
      },
      classRoom: true,
    },
    orderBy: { lastName: "asc" },
  });

  return children;
}

export async function getChild(id: number) {
  await requireRole("ADMIN");

  const child = await prisma.child.findUnique({
    where: { id },
    include: {
      guardians: {
        include: {
          guardian: true,
        },
      },
      classRoom: true,
      allergies: true,
      foodRestrictions: true,
      emergencyContacts: true,
    },
  });

  if (!child) {
    throw new Error("Enfant non trouvé");
  }

  return child;
}

export async function createChild(formData: FormData) {
  const user = await requireRole("ADMIN");

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const birthDate = formData.get("birthDate") as string;
  const enrollmentStatus = formData.get("enrollmentStatus") as string;
  const classRoomId = formData.get("classRoomId") as string | null;

  const validation = childSchema.safeParse({
    firstName,
    lastName,
    birthDate,
    enrollmentStatus,
    classRoomId: classRoomId ? parseInt(classRoomId) : undefined,
  });

  if (!validation.success) {
    return {
      error: validation.error.issues[0].message,
    };
  }

  // ---------- Photo ----------
  const photoResult = await saveChildPhoto(formData);
  if (photoResult.error) {
    return { error: photoResult.error };
  }

  // ---------- Santé initiale (allergies + contacts d'urgence) ----------
  const allergies: { description: string; severity: AllergySeverity }[] = [];
  for (let i = 0; i < 10; i++) {
    const description = (
      (formData.get(`allergyDesc_${i}`) as string) || ""
    ).trim();
    if (!description) break;
    const severityRaw = (
      (formData.get(`allergySeverity_${i}`) as string) || ""
    ).trim();
    const severity = (
      ALLERGY_SEVERITIES.includes(
        severityRaw as (typeof ALLERGY_SEVERITIES)[number]
      )
        ? severityRaw
        : "MODERATE"
    ) as AllergySeverity;
    allergies.push({ description, severity });
  }

  const emergencyContacts: {
    name: string;
    relationship: string;
    phone: string;
  }[] = [];
  for (let i = 0; i < 10; i++) {
    const name = ((formData.get(`contactName_${i}`) as string) || "").trim();
    const relationship = (
      (formData.get(`contactRel_${i}`) as string) || ""
    ).trim();
    const phone = ((formData.get(`contactPhone_${i}`) as string) || "").trim();
    if (!name && !relationship && !phone) break;
    if (!name || !relationship || !phone) {
      return {
        error: "Chaque contact d'urgence nécessite nom, lien et téléphone",
      };
    }
    emergencyContacts.push({ name, relationship, phone });
  }

  // ---------- Guardian (optional, created or linked with the child) ----------
  const guardianMode = (formData.get("guardianMode") as string) || "none";
  const relationshipType = (
    (formData.get("relationshipType") as string) || ""
  ).trim();
  const isLegalGuardian = formData.get("isLegalGuardian") === "on";
  const isPrimaryContact = formData.get("isPrimaryContact") === "on";

  let guardianIdToLink: number | null = null;

  if (guardianMode === "existing" || guardianMode === "new") {
    if (!relationshipType) {
      return { error: "Le type de relation avec le tuteur est requis" };
    }

    if (guardianMode === "existing") {
      const existingGuardianId = parseInt(
        formData.get("guardianId") as string
      );
      if (!Number.isInteger(existingGuardianId)) {
        return { error: "Veuillez sélectionner un tuteur" };
      }
      const exists = await prisma.guardian.findUnique({
        where: { id: existingGuardianId },
        select: { id: true },
      });
      if (!exists) {
        return { error: "Tuteur non trouvé" };
      }
      guardianIdToLink = existingGuardianId;
    } else {
      const guardianValidation = guardianSchema.safeParse({
        firstName: formData.get("guardianFirstName") as string,
        lastName: formData.get("guardianLastName") as string,
        phone: formData.get("guardianPhone") as string,
        email: (formData.get("guardianEmail") as string) || "",
      });
      if (!guardianValidation.success) {
        return { error: guardianValidation.error.issues[0].message };
      }

      const wantsAccount = formData.get("createAccount") === "on";
      const accountEmail = (
        (formData.get("accountEmail") as string) || ""
      ).trim();
      const accountPassword =
        (formData.get("accountPassword") as string) || "";
      const accountName =
        ((formData.get("accountName") as string) || "").trim() ||
        `${guardianValidation.data.firstName} ${guardianValidation.data.lastName}`;

      if (wantsAccount) {
        if (!EMAIL_REGEX.test(accountEmail)) {
          return { error: "Adresse email du compte invalide" };
        }
        if (accountPassword.length < 8) {
          return {
            error: "Le mot de passe doit contenir au moins 8 caractères",
          };
        }
        const existingUser = await prisma.user.findUnique({
          where: { email: accountEmail },
        });
        if (existingUser) {
          return { error: "Un compte existe déjà avec cet email" };
        }
      }

      const passwordHash = wantsAccount
        ? await hashPassword(accountPassword)
        : null;

      const newGuardian = await prisma.$transaction(async (tx) => {
        const created = await tx.guardian.create({
          data: {
            firstName: guardianValidation.data.firstName,
            lastName: guardianValidation.data.lastName,
            phone: guardianValidation.data.phone,
            email: guardianValidation.data.email || null,
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
        }
        return created;
      });
      guardianIdToLink = newGuardian.id;
    }
  }

  const child = await prisma.$transaction(async (tx) => {
    const created = await tx.child.create({
      data: {
        firstName: validation.data.firstName,
        lastName: validation.data.lastName,
        birthDate: new Date(validation.data.birthDate),
        enrollmentStatus: validation.data.enrollmentStatus,
        classRoomId: validation.data.classRoomId,
        photo: photoResult.photo ?? null,
      },
    });

    for (const allergy of allergies) {
      await tx.allergy.create({
        data: { ...allergy, childId: created.id, createdBy: user.id },
      });
    }
    for (const contact of emergencyContacts) {
      await tx.emergencyContact.create({
        data: { ...contact, childId: created.id, createdBy: user.id },
      });
    }

    if (guardianIdToLink !== null) {
      if (isPrimaryContact) {
        await tx.childGuardian.updateMany({
          where: { childId: created.id, isPrimaryContact: true },
          data: { isPrimaryContact: false },
        });
      }
      await tx.childGuardian.create({
        data: {
          childId: created.id,
          guardianId: guardianIdToLink,
          isLegalGuardian,
          isPrimaryContact,
          relationshipType,
        },
      });
    }

    return created;
  });

  return { success: true, child };
}

export async function updateChild(id: number, formData: FormData) {
  await requireRole("ADMIN");

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const birthDate = formData.get("birthDate") as string;
  const enrollmentStatus = formData.get("enrollmentStatus") as string;
  const classRoomId = formData.get("classRoomId") as string | null;

  const validation = childSchema.safeParse({
    firstName,
    lastName,
    birthDate,
    enrollmentStatus,
    classRoomId: classRoomId ? parseInt(classRoomId) : undefined,
  });

  if (!validation.success) {
    return {
      error: validation.error.issues[0].message,
    };
  }

  const photoResult = await saveChildPhoto(formData);
  if (photoResult.error) {
    return { error: photoResult.error };
  }

  const data = {
    firstName: validation.data.firstName,
    lastName: validation.data.lastName,
    birthDate: new Date(validation.data.birthDate),
    enrollmentStatus: validation.data.enrollmentStatus as EnrollmentStatus,
    classRoomId: validation.data.classRoomId,
    ...(photoResult.photo
      ? { photo: photoResult.photo }
      : formData.get("removePhoto") === "on"
        ? { photo: null }
        : {}),
  };

  const child = await prisma.child.update({
    where: { id },
    data,
  });

  return { success: true, child };
}

export async function deleteChild(id: number) {
  await requireRole("ADMIN");

  await prisma.child.delete({
    where: { id },
  });

  return { success: true };
}

export async function updateChildIdentity(
  childId: number,
  formData: FormData
) {
  const user = await requireAuth();

  if (!Number.isInteger(childId)) {
    return { error: "Paramètres invalides" };
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
      return { error: "Action non autorisée" };
    }
  } else if (user.role !== "ADMIN") {
    return { error: "Action non autorisée" };
  }

  const validation = childIdentitySchema.safeParse({
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    birthDate: formData.get("birthDate") as string,
  });
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const photoResult = await saveChildPhoto(formData);
  if (photoResult.error) {
    return { error: photoResult.error };
  }

  const data: {
    firstName: string;
    lastName: string;
    birthDate: Date;
    photo?: string | null;
  } = {
    firstName: validation.data.firstName,
    lastName: validation.data.lastName,
    birthDate: new Date(validation.data.birthDate),
  };

  if (photoResult.photo) {
    data.photo = photoResult.photo;
  } else if (formData.get("removePhoto") === "on") {
    data.photo = null;
  }

  await prisma.child.update({ where: { id: childId }, data });
  return { success: true };
}

export async function linkGuardian(formData: FormData) {
  await requireRole("ADMIN");

  const childId = formData.get("childId") as string;
  const guardianId = formData.get("guardianId") as string;
  const isLegalGuardian = formData.get("isLegalGuardian") === "true";
  const isPrimaryContact = formData.get("isPrimaryContact") === "true";
  const relationshipType = formData.get("relationshipType") as string;

  const validation = linkGuardianSchema.safeParse({
    childId: childId ? parseInt(childId) : undefined,
    guardianId: guardianId ? parseInt(guardianId) : undefined,
    isLegalGuardian,
    isPrimaryContact,
    relationshipType,
  });

  if (!validation.success) {
    return {
      error: validation.error.issues[0].message,
    };
  }

  // Check if relationship already exists
  const existing = await prisma.childGuardian.findUnique({
    where: {
      childId_guardianId: {
        childId: validation.data.childId,
        guardianId: validation.data.guardianId,
      },
    },
  });

  if (existing) {
    return {
      error: "Cette relation existe déjà",
    };
  }

  // If setting as primary contact, remove primary from other guardians
  if (validation.data.isPrimaryContact) {
    await prisma.childGuardian.updateMany({
      where: {
        childId: validation.data.childId,
        isPrimaryContact: true,
      },
      data: {
        isPrimaryContact: false,
      },
    });
  }

  await prisma.childGuardian.create({
    data: {
      childId: validation.data.childId,
      guardianId: validation.data.guardianId,
      isLegalGuardian: validation.data.isLegalGuardian,
      isPrimaryContact: validation.data.isPrimaryContact,
      relationshipType: validation.data.relationshipType,
    },
  });

  return { success: true };
}

export async function unlinkGuardian(childId: number, guardianId: number) {
  await requireRole("ADMIN");

  await prisma.childGuardian.delete({
    where: {
      childId_guardianId: {
        childId,
        guardianId,
      },
    },
  });

  return { success: true };
}
