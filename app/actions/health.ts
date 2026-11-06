"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  getEducatorClassRoomIds,
  getParentChildIds,
} from "@/lib/permissions";
import { parseDay } from "@/lib/dates";

type SessionUser = { id: number; role: string };

async function canAccessChild(
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
    const classRoomIds = await getEducatorClassRoomIds(user.id);
    return classRoomIds.includes(child.classRoomId);
  }
  if (user.role === "PARENT") {
    const childIds = await getParentChildIds(user.id);
    return childIds.includes(child.id);
  }
  return false;
}

async function requireChildAccess(childId: number) {
  const user = await requireAuth();

  if (!Number.isInteger(childId)) {
    throw new Error("Paramètres invalides");
  }

  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { id: true, classRoomId: true },
  });

  if (!child) {
    throw new Error("Enfant non trouvé");
  }

  const allowed = await canAccessChild(user, child);
  if (!allowed) {
    throw new Error("Forbidden");
  }

  return { user, child };
}

export async function getChildHealth(childId: number) {
  const { child } = await requireChildAccess(childId);

  const data = await prisma.child.findUniqueOrThrow({
    where: { id: child.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      photo: true,
      classRoom: { select: { id: true, name: true } },
      emergencyContacts: { orderBy: { id: "asc" } },
      allergies: { orderBy: { id: "asc" } },
      foodRestrictions: { orderBy: { id: "asc" } },
      authorizedPickupPeople: { orderBy: { id: "asc" } },
      incidents: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { creator: { select: { name: true } } },
      },
      parentInstructions: { orderBy: { createdAt: "desc" }, take: 100 },
      pickupNotifications: {
        orderBy: { pickupDate: "desc" },
        take: 100,
        include: { creator: { select: { name: true } } },
      },
      insuranceRecords: { orderBy: { id: "asc" } },
    },
  });

  return data;
}

function requireAdmin(user: SessionUser) {
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

function requireHealthWriter(user: SessionUser) {
  if (user.role !== "ADMIN" && user.role !== "PARENT") {
    throw new Error("Action non autorisée");
  }
}

function canDeleteHealthEntry(
  user: SessionUser,
  createdBy: number | null
): boolean {
  if (user.role === "ADMIN") {
    return true;
  }
  if (user.role === "PARENT") {
    return createdBy === user.id;
  }
  return false;
}

// ---------- Emergency contacts ----------

export async function createEmergencyContact(formData: FormData) {
  const childId = parseInt(formData.get("childId") as string);
  const { user } = await requireChildAccess(childId);
  requireHealthWriter(user);

  const name = ((formData.get("name") as string) || "").trim();
  const relationship = ((formData.get("relationship") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim();

  if (!name || !relationship || !phone) {
    return { error: "Tous les champs sont obligatoires" };
  }

  await prisma.emergencyContact.create({
    data: { childId, name, relationship, phone, createdBy: user.id },
  });
  return { success: true };
}

export async function deleteEmergencyContact(id: number) {
  const user = await requireAuth();
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  const entry = await prisma.emergencyContact.findUnique({
    where: { id },
    select: { createdBy: true },
  });
  if (!entry || !canDeleteHealthEntry(user, entry.createdBy)) {
    return { error: "Action non autorisée" };
  }
  await prisma.emergencyContact.delete({ where: { id } });
  return { success: true };
}

// ---------- Allergies ----------

export async function createAllergy(formData: FormData) {
  const childId = parseInt(formData.get("childId") as string);
  const { user } = await requireChildAccess(childId);
  requireHealthWriter(user);

  const description = ((formData.get("description") as string) || "").trim();
  const severity = ((formData.get("severity") as string) || "").trim();

  if (!description || !severity) {
    return { error: "Tous les champs sont obligatoires" };
  }

  await prisma.allergy.create({
    data: { childId, description, severity, createdBy: user.id },
  });
  return { success: true };
}

export async function deleteAllergy(id: number) {
  const user = await requireAuth();
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  const entry = await prisma.allergy.findUnique({
    where: { id },
    select: { createdBy: true },
  });
  if (!entry || !canDeleteHealthEntry(user, entry.createdBy)) {
    return { error: "Action non autorisée" };
  }
  await prisma.allergy.delete({ where: { id } });
  return { success: true };
}

// ---------- Food restrictions ----------

export async function createFoodRestriction(formData: FormData) {
  const childId = parseInt(formData.get("childId") as string);
  const { user } = await requireChildAccess(childId);
  requireHealthWriter(user);

  const description = ((formData.get("description") as string) || "").trim();
  if (!description) {
    return { error: "La description est obligatoire" };
  }

  await prisma.foodRestriction.create({
    data: { childId, description, createdBy: user.id },
  });
  return { success: true };
}

export async function deleteFoodRestriction(id: number) {
  const user = await requireAuth();
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  const entry = await prisma.foodRestriction.findUnique({
    where: { id },
    select: { createdBy: true },
  });
  if (!entry || !canDeleteHealthEntry(user, entry.createdBy)) {
    return { error: "Action non autorisée" };
  }
  await prisma.foodRestriction.delete({ where: { id } });
  return { success: true };
}

// ---------- Authorized pickup people ----------

export async function createAuthorizedPickupPerson(formData: FormData) {
  const childId = parseInt(formData.get("childId") as string);
  const { user } = await requireChildAccess(childId);
  requireHealthWriter(user);

  const name = ((formData.get("name") as string) || "").trim();
  const relationship = ((formData.get("relationship") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim();

  if (!name || !relationship || !phone) {
    return { error: "Tous les champs sont obligatoires" };
  }

  await prisma.authorizedPickupPerson.create({
    data: { childId, name, relationship, phone, createdBy: user.id },
  });
  return { success: true };
}

export async function deleteAuthorizedPickupPerson(id: number) {
  const user = await requireAuth();
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  const entry = await prisma.authorizedPickupPerson.findUnique({
    where: { id },
    select: { createdBy: true },
  });
  if (!entry || !canDeleteHealthEntry(user, entry.createdBy)) {
    return { error: "Action non autorisée" };
  }
  await prisma.authorizedPickupPerson.delete({ where: { id } });
  return { success: true };
}

// ---------- Insurance ----------

export async function createInsuranceRecord(formData: FormData) {
  const childId = parseInt(formData.get("childId") as string);
  const { user } = await requireChildAccess(childId);
  requireAdmin(user);

  const provider = ((formData.get("provider") as string) || "").trim();
  const reference = ((formData.get("reference") as string) || "").trim();
  const status = ((formData.get("status") as string) || "").trim();
  const startDate = parseDay(formData.get("startDate") as string);
  const endDate = parseDay(formData.get("endDate") as string);

  if (!provider || !reference || !status || !startDate || !endDate) {
    return { error: "Tous les champs sont obligatoires" };
  }

  await prisma.insuranceRecord.create({
    data: { childId, provider, reference, status, startDate, endDate },
  });
  return { success: true };
}

export async function deleteInsuranceRecord(id: number) {
  const user = await requireAuth();
  requireAdmin(user);
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  await prisma.insuranceRecord.delete({ where: { id } });
  return { success: true };
}

// ---------- Incidents ----------

export async function createIncident(formData: FormData) {
  const childId = parseInt(formData.get("childId") as string);
  const { user } = await requireChildAccess(childId);

  if (user.role !== "ADMIN" && user.role !== "EDUCATOR") {
    return { error: "Action non autorisée" };
  }

  const description = ((formData.get("description") as string) || "").trim();
  const actionTaken = ((formData.get("actionTaken") as string) || "").trim();
  const parentInformed = formData.get("parentInformed") === "on";

  if (!description || !actionTaken) {
    return { error: "La description et les mesures prises sont obligatoires" };
  }

  await prisma.incident.create({
    data: { childId, description, actionTaken, parentInformed, createdBy: user.id },
  });
  return { success: true };
}

export async function deleteIncident(id: number) {
  const user = await requireAuth();
  requireAdmin(user);
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  await prisma.incident.delete({ where: { id } });
  return { success: true };
}

// ---------- Pickup notifications ----------

export async function createPickupNotification(formData: FormData) {
  const childId = parseInt(formData.get("childId") as string);
  const { user } = await requireChildAccess(childId);

  if (user.role !== "ADMIN" && user.role !== "EDUCATOR") {
    return { error: "Action non autorisée" };
  }

  const personName = ((formData.get("personName") as string) || "").trim();
  const pickupDateRaw = formData.get("pickupDate") as string;
  const pickupDate = pickupDateRaw ? new Date(pickupDateRaw) : null;

  if (!personName || !pickupDate || isNaN(pickupDate.getTime())) {
    return { error: "Le nom et la date/heure sont obligatoires" };
  }

  await prisma.pickupNotification.create({
    data: { childId, personName, pickupDate, createdBy: user.id },
  });
  return { success: true };
}

export async function deletePickupNotification(id: number) {
  const user = await requireAuth();
  requireAdmin(user);
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  await prisma.pickupNotification.delete({ where: { id } });
  return { success: true };
}

// ---------- Parent instructions ----------

export async function createParentInstruction(formData: FormData) {
  const childId = parseInt(formData.get("childId") as string);
  const { user } = await requireChildAccess(childId);

  if (user.role !== "PARENT" && user.role !== "ADMIN") {
    return { error: "Action non autorisée" };
  }

  const content = ((formData.get("content") as string) || "").trim();
  if (!content) {
    return { error: "Le contenu est obligatoire" };
  }

  await prisma.parentInstruction.create({
    data: { childId, content, createdBy: user.id },
  });
  return { success: true };
}

export async function deleteParentInstruction(id: number) {
  const user = await requireAuth();

  const instruction = await prisma.parentInstruction.findUnique({
    where: { id },
    select: { childId: true, createdBy: true },
  });

  if (!instruction) {
    return { error: "Instruction non trouvée" };
  }

  if (canDeleteHealthEntry(user, instruction.createdBy)) {
    await prisma.parentInstruction.delete({ where: { id } });
    return { success: true };
  }

  return { error: "Action non autorisée" };
}
