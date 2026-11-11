"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { parseDay, todayTunis } from "@/lib/dates";
import { syncAllClassOccurrences } from "@/lib/occurrences";
import type {
  Weekday,
  TimetableSlotKind,
} from "@/generated/prisma/enums";
import { WEEKDAYS, SLOT_KINDS } from "@/lib/schedule-constants";

const MAX_SLOT_MINUTES = 1440;

// ---------- Versions ----------

export async function getTimetableVersions() {
  await requireAuth();

  const versions = await prisma.timetableVersion.findMany({
    orderBy: { validFrom: "desc" },
    include: { _count: { select: { slots: true } } },
  });

  const today = todayTunis().getTime();
  return versions.map((v) => {
    const from = v.validFrom.getTime();
    const to = v.validTo?.getTime() ?? null;
    const status = !v.isActive
      ? "INACTIVE"
      : today >= from && (to === null || today <= to)
        ? "CURRENT"
        : today < from
          ? "UPCOMING"
          : "PAST";
    return { ...v, status, slotCount: v._count.slots };
  });
}

export async function getTimetableVersion(id: number) {
  await requireAuth();

  if (!Number.isInteger(id)) {
    throw new Error("Paramètres invalides");
  }

  const version = await prisma.timetableVersion.findUnique({
    where: { id },
    include: {
      slots: {
        include: { activity: { select: { id: true, title: true } } },
      },
    },
  });

  if (!version) {
    throw new Error("Version de planning non trouvée");
  }

  // Weekday is stored as TEXT: sort explicitly MONDAY..SUNDAY, then position.
  const weekdayRank = new Map(WEEKDAYS.map((w, i) => [w, i]));
  version.slots.sort(
    (a, b) =>
      (weekdayRank.get(a.weekday) ?? 0) - (weekdayRank.get(b.weekday) ?? 0) ||
      a.position - b.position
  );

  return version;
}

// Activities that can be linked to ACTIVITY slots (read-only for now;
// full CRUD arrives with the activities phase).
export async function getActivityOptions() {
  await requireAuth();
  return prisma.activity.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true, category: true },
  });
}

function parseVersionInput(input: {
  label: string;
  validFrom: string;
  validTo?: string;
  isActive?: boolean;
}) {
  const label = (input.label || "").trim();
  const validFrom = parseDay(input.validFrom || "");
  const validTo = input.validTo ? parseDay(input.validTo) : null;

  if (!label || !validFrom) {
    return { error: "Le libellé et la date de début sont obligatoires" };
  }
  if (input.validTo && (!validTo || validTo < validFrom)) {
    return { error: "La date de fin doit être postérieure à la date de début" };
  }
  return { label, validFrom, validTo, isActive: input.isActive ?? true };
}

// Active versions must not have overlapping validity ranges: a single
// version must apply to any given date.
async function assertNoVersionOverlap(
  validFrom: Date,
  validTo: Date | null,
  excludeId?: number
): Promise<string | null> {
  const candidates = await prisma.timetableVersion.findMany({
    where: {
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, label: true, validFrom: true, validTo: true },
  });

  const from = validFrom.getTime();
  const to = validTo?.getTime() ?? Number.POSITIVE_INFINITY;

  for (const c of candidates) {
    const cFrom = c.validFrom.getTime();
    const cTo = c.validTo?.getTime() ?? Number.POSITIVE_INFINITY;
    if (from <= cTo && cFrom <= to) {
      return `Chevauchement avec la version « ${c.label} » (${c.validFrom.toLocaleDateString("fr-FR")} → ${c.validTo ? c.validTo.toLocaleDateString("fr-FR") : "…"})`;
    }
  }
  return null;
}

export async function createTimetableVersion(input: {
  label: string;
  validFrom: string;
  validTo?: string;
  isActive?: boolean;
}) {
  const user = await requireRole("ADMIN");

  const parsed = parseVersionInput(input);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  if (parsed.isActive) {
    const overlap = await assertNoVersionOverlap(
      parsed.validFrom,
      parsed.validTo
    );
    if (overlap) {
      return { error: overlap };
    }
  }

  const version = await prisma.timetableVersion.create({
    data: {
      label: parsed.label,
      validFrom: parsed.validFrom,
      validTo: parsed.validTo,
      isActive: parsed.isActive,
      createdBy: user.id,
    },
  });

  await syncAllClassOccurrences();
  return { success: true, version };
}

export async function updateTimetableVersion(
  id: number,
  input: {
    label: string;
    validFrom: string;
    validTo?: string;
    isActive?: boolean;
  }
) {
  await requireRole("ADMIN");

  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }

  const existing = await prisma.timetableVersion.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Version non trouvée" };
  }

  const parsed = parseVersionInput(input);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  if (parsed.isActive) {
    const overlap = await assertNoVersionOverlap(
      parsed.validFrom,
      parsed.validTo,
      id
    );
    if (overlap) {
      return { error: overlap };
    }
  }

  const version = await prisma.timetableVersion.update({
    where: { id },
    data: {
      label: parsed.label,
      validFrom: parsed.validFrom,
      validTo: parsed.validTo,
      isActive: parsed.isActive,
    },
  });

  await syncAllClassOccurrences();
  return { success: true, version };
}

export async function deleteTimetableVersion(id: number) {
  await requireRole("ADMIN");

  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }

  const slotCount = await prisma.timetableSlot.count({
    where: { timetableId: id },
  });
  if (slotCount > 0) {
    return {
      error:
        "Impossible de supprimer une version contenant des créneaux. Supprimez d'abord les créneaux.",
    };
  }

  await prisma.timetableVersion.delete({ where: { id } });
  await syncAllClassOccurrences();
  return { success: true };
}

// ---------- Slots ----------

interface SlotInput {
  weekday: string;
  kind: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
  activityId?: number | null;
  notes?: string | null;
}

function parseSlotInput(input: SlotInput) {
  const weekday = input.weekday as Weekday;
  const kind = input.kind as TimetableSlotKind;
  const title = (input.title || "").trim();
  const notes = (input.notes || "").trim() || null;

  if (!WEEKDAYS.includes(weekday) || !SLOT_KINDS.includes(kind)) {
    return { error: "Jour ou type de créneau invalide" };
  }
  if (!title) {
    return { error: "Le titre est obligatoire" };
  }
  if (
    !Number.isInteger(input.startMinutes) ||
    !Number.isInteger(input.endMinutes) ||
    input.startMinutes < 0 ||
    input.endMinutes > MAX_SLOT_MINUTES ||
    input.startMinutes >= input.endMinutes
  ) {
    return { error: "Les horaires sont invalides" };
  }

  const activityId =
    input.activityId != null && Number.isInteger(input.activityId)
      ? input.activityId
      : null;

  return { weekday, kind, title, notes, activityId };
}

// Two slots on the same weekday may not overlap in time.
async function assertNoSlotOverlap(
  timetableId: number,
  weekday: Weekday,
  startMinutes: number,
  endMinutes: number,
  excludeId?: number
): Promise<string | null> {
  const slots = await prisma.timetableSlot.findMany({
    where: {
      timetableId,
      weekday,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, title: true, startMinutes: true, endMinutes: true },
  });

  for (const s of slots) {
    if (startMinutes < s.endMinutes && s.startMinutes < endMinutes) {
      return `Chevauchement avec « ${s.title} » (${String(Math.floor(s.startMinutes / 60)).padStart(2, "0")}:${String(s.startMinutes % 60).padStart(2, "0")} - ${String(Math.floor(s.endMinutes / 60)).padStart(2, "0")}:${String(s.endMinutes % 60).padStart(2, "0")})`;
    }
  }
  return null;
}

async function assertActivityExists(activityId: number | null) {
  if (activityId === null) {
    return null;
  }
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { id: true },
  });
  return activity ? null : "Activité introuvable";
}

export async function createTimetableSlot(
  timetableId: number,
  input: SlotInput
) {
  await requireRole("ADMIN");

  if (!Number.isInteger(timetableId)) {
    return { error: "Paramètres invalides" };
  }

  const version = await prisma.timetableVersion.findUnique({
    where: { id: timetableId },
  });
  if (!version) {
    return { error: "Version non trouvée" };
  }

  const parsed = parseSlotInput(input);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const activityError = await assertActivityExists(parsed.activityId);
  if (activityError) {
    return { error: activityError };
  }

  const overlap = await assertNoSlotOverlap(
    timetableId,
    parsed.weekday,
    input.startMinutes,
    input.endMinutes
  );
  if (overlap) {
    return { error: overlap };
  }

  const maxPosition = await prisma.timetableSlot.aggregate({
    where: { timetableId, weekday: parsed.weekday },
    _max: { position: true },
  });

  const slot = await prisma.timetableSlot.create({
    data: {
      timetableId,
      weekday: parsed.weekday,
      kind: parsed.kind,
      title: parsed.title,
      startMinutes: input.startMinutes,
      endMinutes: input.endMinutes,
      activityId: parsed.activityId,
      notes: parsed.notes,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  await syncAllClassOccurrences();
  return { success: true, slot };
}

export async function updateTimetableSlot(id: number, input: SlotInput) {
  await requireRole("ADMIN");

  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }

  const existing = await prisma.timetableSlot.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Créneau non trouvé" };
  }

  const parsed = parseSlotInput(input);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const activityError = await assertActivityExists(parsed.activityId);
  if (activityError) {
    return { error: activityError };
  }

  const overlap = await assertNoSlotOverlap(
    existing.timetableId,
    parsed.weekday,
    input.startMinutes,
    input.endMinutes,
    id
  );
  if (overlap) {
    return { error: overlap };
  }

  const slot = await prisma.timetableSlot.update({
    where: { id },
    data: {
      weekday: parsed.weekday,
      kind: parsed.kind,
      title: parsed.title,
      startMinutes: input.startMinutes,
      endMinutes: input.endMinutes,
      activityId: parsed.activityId,
      notes: parsed.notes,
    },
  });

  await syncAllClassOccurrences();
  return { success: true, slot };
}

export async function deleteTimetableSlot(id: number) {
  await requireRole("ADMIN");

  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }

  const slot = await prisma.timetableSlot.findUnique({ where: { id } });
  if (!slot) {
    return { error: "Créneau non trouvé" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.timetableSlot.delete({ where: { id } });
    // Re-compact positions for the remaining slots of that weekday.
    const remaining = await tx.timetableSlot.findMany({
      where: { timetableId: slot.timetableId, weekday: slot.weekday },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    for (let i = 0; i < remaining.length; i++) {
      await tx.timetableSlot.update({
        where: { id: remaining[i].id },
        data: { position: i },
      });
    }
  });

  await syncAllClassOccurrences();
  return { success: true };
}

// Reorders the slots of one weekday. `orderedIds` must contain exactly
// the ids of that weekday's slots.
export async function reorderTimetableSlots(
  timetableId: number,
  weekday: string,
  orderedIds: number[]
) {
  await requireRole("ADMIN");

  if (
    !Number.isInteger(timetableId) ||
    !WEEKDAYS.includes(weekday as Weekday) ||
    !Array.isArray(orderedIds) ||
    !orderedIds.every((id) => Number.isInteger(id))
  ) {
    return { error: "Paramètres invalides" };
  }

  const slots = await prisma.timetableSlot.findMany({
    where: { timetableId, weekday: weekday as Weekday },
    select: { id: true },
  });

  const existingIds = new Set(slots.map((s) => s.id));
  const givenIds = new Set(orderedIds);
  if (
    existingIds.size !== givenIds.size ||
    ![...existingIds].every((id) => givenIds.has(id))
  ) {
    return { error: "La liste des créneaux est incohérente" };
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.timetableSlot.update({
        where: { id },
        data: { position: index },
      })
    )
  );

  return { success: true };
}
