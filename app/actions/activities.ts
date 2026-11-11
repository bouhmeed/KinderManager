"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { canAccessClassRoom, getEducatorClassRoomIds } from "@/lib/permissions";
import { parseDay, todayTunis } from "@/lib/dates";
import { hhmmToMinutes, minutesToHHMM } from "@/lib/tunis-time";
import {
  syncClassOccurrences,
  syncAllClassOccurrences,
  ensureOccurrencesForClassDate,
  occurrenceHorizon,
} from "@/lib/occurrences";
import { notifyClassParents } from "@/lib/notify";
import type {
  ActivityCategory,
  Weekday,
} from "@/generated/prisma/enums";
import { WEEKDAYS, ACTIVITY_CATEGORIES } from "@/lib/schedule-constants";

// ---------- Activities ----------

export async function getActivities() {
  await requireAuth();
  return prisma.activity.findMany({
    orderBy: { title: "asc" },
    include: {
      _count: { select: { schedules: true, occurrences: true } },
    },
  });
}

export async function getActivity(id: number) {
  await requireAuth();
  if (!Number.isInteger(id)) {
    throw new Error("Paramètres invalides");
  }
  const activity = await prisma.activity.findUnique({
    where: { id },
    include: {
      schedules: {
        orderBy: { validFrom: "desc" },
        include: {
          classRoom: { select: { id: true, name: true } },
          educator: { select: { id: true, phone: true, user: { select: { name: true } } } },
        },
      },
      creator: { select: { name: true } },
    },
  });
  if (!activity) {
    throw new Error("Activité non trouvée");
  }
  return activity;
}

function parseActivityInput(input: {
  title: string;
  description?: string | null;
  category: string;
  color?: string | null;
  isActive?: boolean;
}) {
  const title = (input.title || "").trim();
  const category = input.category as ActivityCategory;
  if (!title) {
    return { error: "Le titre est obligatoire" };
  }
  if (!ACTIVITY_CATEGORIES.includes(category)) {
    return { error: "Catégorie invalide" };
  }
  return {
    title,
    description: (input.description || "").trim() || null,
    category,
    color: (input.color || "").trim() || null,
    isActive: input.isActive ?? true,
  };
}

export async function createActivity(input: {
  title: string;
  description?: string | null;
  category: string;
  color?: string | null;
}) {
  const user = await requireRole("ADMIN");
  const parsed = parseActivityInput(input);
  if ("error" in parsed) {
    return { error: parsed.error };
  }
  const activity = await prisma.activity.create({
    data: { ...parsed, createdBy: user.id },
  });
  return { success: true, activity };
}

export async function updateActivity(
  id: number,
  input: {
    title: string;
    description?: string | null;
    category: string;
    color?: string | null;
    isActive?: boolean;
  }
) {
  await requireRole("ADMIN");
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Activité non trouvée" };
  }
  const parsed = parseActivityInput(input);
  if ("error" in parsed) {
    return { error: parsed.error };
  }
  const activity = await prisma.activity.update({
    where: { id },
    data: parsed,
  });
  return { success: true, activity };
}

export async function setActivityActive(id: number, isActive: boolean) {
  await requireRole("ADMIN");
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  await prisma.activity.update({ where: { id }, data: { isActive } });
  return { success: true };
}

export async function deleteActivity(id: number) {
  await requireRole("ADMIN");
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  const [schedules, occurrences, slots, items] = await Promise.all([
    prisma.activitySchedule.count({ where: { activityId: id } }),
    prisma.scheduleOccurrence.count({ where: { activityId: id } }),
    prisma.timetableSlot.count({ where: { activityId: id } }),
    prisma.scheduleExceptionItem.count({ where: { activityId: id } }),
  ]);
  if (schedules + occurrences + slots + items > 0) {
    return {
      error:
        "Impossible de supprimer : cette activité est référencée par un planning, une séance ou une exception. Désactivez-la plutôt.",
    };
  }
  await prisma.activity.delete({ where: { id } });
  return { success: true };
}

// ---------- Activity schedules ----------

export async function getActivitySchedules(activityId: number) {
  await requireAuth();
  return prisma.activitySchedule.findMany({
    where: { activityId },
    orderBy: [{ validFrom: "desc" }, { id: "desc" }],
    include: {
      classRoom: { select: { id: true, name: true } },
      educator: {
        select: { id: true, user: { select: { name: true } } },
      },
    },
  });
}

export async function getEducatorOptions() {
  await requireAuth();
  return prisma.educatorProfile.findMany({
    where: { isActive: true },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
}

export async function getClassRoomOptions() {
  await requireAuth();
  return prisma.classRoom.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

interface ScheduleInput {
  activityId: number;
  classRoomId?: number | null;
  weekday?: string | null;
  start: string; // "HH:MM"
  end: string;
  validFrom: string; // "YYYY-MM-DD"
  validTo?: string | null;
  educatorId?: number | null;
}

function parseScheduleInput(input: ScheduleInput) {
  const activityId = input.activityId;
  const classRoomId = input.classRoomId ?? null;
  const weekday = (input.weekday || null) as Weekday | null;
  const startMinutes = hhmmToMinutes(input.start || "");
  const endMinutes = hhmmToMinutes(input.end || "");
  const validFrom = parseDay(input.validFrom || "");
  const validTo = input.validTo ? parseDay(input.validTo) : null;

  if (!Number.isInteger(activityId) || !validFrom) {
    return { error: "Paramètres invalides" };
  }
  if (classRoomId !== null && !Number.isInteger(classRoomId)) {
    return { error: "Classe invalide" };
  }
  if (weekday !== null && !WEEKDAYS.includes(weekday)) {
    return { error: "Jour invalide" };
  }
  if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
    return { error: "Les horaires sont invalides" };
  }
  if (validTo && validTo < validFrom) {
    return { error: "La date de fin doit être postérieure à la date de début" };
  }
  if (weekday === null && validTo && validTo.getTime() !== validFrom.getTime()) {
    return {
      error: "Une séance ponctuelle ne peut avoir qu'une seule date",
    };
  }

  return {
    activityId,
    classRoomId,
    weekday,
    startMinutes,
    endMinutes,
    validFrom,
    validTo,
    educatorId: input.educatorId ?? null,
  };
}

async function affectedClassIds(
  classRoomId: number | null
): Promise<number[]> {
  if (classRoomId !== null) {
    return [classRoomId];
  }
  const rooms = await prisma.classRoom.findMany({ select: { id: true } });
  return rooms.map((r) => r.id);
}

async function resyncFor(input: { classRoomId: number | null }) {
  const { from, to } = occurrenceHorizon();
  for (const id of await affectedClassIds(input.classRoomId)) {
    await syncClassOccurrences(id, from, to);
  }
}

export async function createActivitySchedule(input: ScheduleInput) {
  const user = await requireRole("ADMIN");

  const parsed = parseScheduleInput(input);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const [activity, educator] = await Promise.all([
    prisma.activity.findUnique({ where: { id: parsed.activityId } }),
    parsed.educatorId !== null
      ? prisma.educatorProfile.findUnique({
          where: { id: parsed.educatorId },
        })
      : Promise.resolve(null),
  ]);
  if (!activity) {
    return { error: "Activité introuvable" };
  }
  if (parsed.educatorId !== null && !educator) {
    return { error: "Éducateur introuvable" };
  }
  if (parsed.classRoomId !== null) {
    const room = await prisma.classRoom.findUnique({
      where: { id: parsed.classRoomId },
    });
    if (!room) {
      return { error: "Classe introuvable" };
    }
  }

  const schedule = await prisma.activitySchedule.create({
    data: { ...parsed, createdBy: user.id },
  });
  await resyncFor({ classRoomId: parsed.classRoomId });
  return { success: true, schedule };
}

export async function updateActivitySchedule(
  id: number,
  input: ScheduleInput
) {
  await requireRole("ADMIN");
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  const existing = await prisma.activitySchedule.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Planification non trouvée" };
  }

  const parsed = parseScheduleInput(input);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const schedule = await prisma.activitySchedule.update({
    where: { id },
    data: parsed,
  });
  // Resync both the old and new class scopes.
  const { from, to } = occurrenceHorizon();
  const ids = new Set(
    await affectedClassIds(existing.classRoomId)
  );
  for (const cid of await affectedClassIds(parsed.classRoomId)) {
    ids.add(cid);
  }
  for (const cid of ids) {
    await syncClassOccurrences(cid, from, to);
  }
  return { success: true, schedule };
}

export async function deleteActivitySchedule(id: number) {
  await requireRole("ADMIN");
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  const existing = await prisma.activitySchedule.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Planification non trouvée" };
  }
  await prisma.activitySchedule.delete({ where: { id } });
  await resyncFor({ classRoomId: existing.classRoomId });
  return { success: true };
}

// ---------- Occurrences ----------

async function assertOccurrenceAccess(
  user: { id: number; role: string },
  occurrence: { classRoomId: number }
) {
  if (user.role === "PARENT") {
    throw new Error("Forbidden");
  }
  if (!(await canAccessClassRoom(user, occurrence.classRoomId))) {
    throw new Error("Forbidden");
  }
}

// Keep the 60-day occurrence horizon fresh: at most one full resync per hour
// per server process, triggered when sessions are browsed.
let lastHorizonSync = 0;
const HORIZON_SYNC_INTERVAL = 60 * 60 * 1000;

export async function getOccurrences(filters: {
  classRoomId?: number;
  date?: string;
}) {
  const user = await requireAuth();
  if (Date.now() - lastHorizonSync > HORIZON_SYNC_INTERVAL) {
    lastHorizonSync = Date.now();
    syncAllClassOccurrences().catch(() => {});
  }

  let classRoomIds: number[] | undefined;
  if (user.role === "EDUCATOR") {
    classRoomIds = await getEducatorClassRoomIds(user.id);
    if (classRoomIds.length === 0) {
      return [];
    }
  }

  const date = filters.date ? parseDay(filters.date) : undefined;
  if (filters.date && !date) {
    throw new Error("Date invalide");
  }

  if (date && (classRoomIds === undefined || filters.classRoomId)) {
    const targetClass = filters.classRoomId;
    if (targetClass) {
      if (classRoomIds && !classRoomIds.includes(targetClass)) {
        return [];
      }
      await ensureOccurrencesForClassDate(targetClass, date);
    } else if (classRoomIds) {
      for (const id of classRoomIds) {
        await ensureOccurrencesForClassDate(id, date);
      }
    } else {
      const rooms = await prisma.classRoom.findMany({ select: { id: true } });
      for (const r of rooms) {
        await ensureOccurrencesForClassDate(r.id, date);
      }
    }
  }

  return prisma.scheduleOccurrence.findMany({
    where: {
      ...(classRoomIds ? { classRoomId: { in: classRoomIds } } : {}),
      ...(filters.classRoomId ? { classRoomId: filters.classRoomId } : {}),
      ...(date ? { date } : {}),
    },
    include: {
      classRoom: { select: { id: true, name: true } },
      activity: { select: { id: true, title: true, category: true } },
      educator: { select: { id: true, user: { select: { name: true } } } },
    },
    orderBy: [{ date: "asc" }, { startMinutes: "asc" }],
    take: 500,
  });
}

export async function getOccurrence(id: number) {
  const user = await requireAuth();
  if (!Number.isInteger(id)) {
    throw new Error("Paramètres invalides");
  }
  const occurrence = await prisma.scheduleOccurrence.findUnique({
    where: { id },
    include: {
      classRoom: { select: { id: true, name: true } },
      activity: { select: { id: true, title: true, category: true, description: true } },
      educator: { select: { id: true, user: { select: { name: true } } } },
    },
  });
  if (!occurrence) {
    throw new Error("Séance non trouvée");
  }
  await assertOccurrenceAccess(user, occurrence);
  return occurrence;
}

// Educator/admin edits one occurrence (times, title). Sets
// manuallyEdited so future syncs don't overwrite the change.
// Past occurrences are immutable.
export async function updateOccurrence(
  id: number,
  input: {
    title?: string;
    start?: string;
    end?: string;
    educatorNote?: string | null;
    noteVisibleToParents?: boolean;
  }
) {
  const user = await requireAuth();
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  const occurrence = await prisma.scheduleOccurrence.findUnique({
    where: { id },
  });
  if (!occurrence) {
    return { error: "Séance non trouvée" };
  }
  try {
    await assertOccurrenceAccess(user, occurrence);
  } catch {
    return { error: "Action non autorisée" };
  }

  const today = todayTunis().getTime();
  if (occurrence.date.getTime() < today) {
    return { error: "Les séances passées ne peuvent pas être modifiées" };
  }

  const data: Record<string, unknown> = { manuallyEdited: true };
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) {
      return { error: "Le titre est obligatoire" };
    }
    data.title = title;
  }
  let startMinutes = occurrence.startMinutes;
  let endMinutes = occurrence.endMinutes;
  if (input.start !== undefined || input.end !== undefined) {
    const s = hhmmToMinutes(input.start ?? minutesToHHMM(occurrence.startMinutes));
    const e = hhmmToMinutes(input.end ?? minutesToHHMM(occurrence.endMinutes));
    if (s === null || e === null || s >= e) {
      return { error: "Les horaires sont invalides" };
    }
    startMinutes = s;
    endMinutes = e;
    data.startMinutes = s;
    data.endMinutes = e;
  }
  if (input.educatorNote !== undefined) {
    data.educatorNote = (input.educatorNote || "").trim() || null;
  }
  if (input.noteVisibleToParents !== undefined) {
    data.noteVisibleToParents = input.noteVisibleToParents;
  }

  const scheduleChanged =
    startMinutes !== occurrence.startMinutes ||
    endMinutes !== occurrence.endMinutes ||
    (input.title !== undefined && input.title.trim() !== occurrence.title);

  await prisma.scheduleOccurrence.update({ where: { id }, data });
  if (scheduleChanged && occurrence.status !== "CANCELLED") {
    await notifyClassParents(
      occurrence.classRoomId,
      `La séance « ${occurrence.title} » du ${occurrence.date.toISOString().slice(0, 10)} a été modifiée.`,
      "OCCURRENCE_UPDATED",
      `/calendrier`
    );
  }
  return { success: true };
}

export async function cancelOccurrence(id: number) {
  const user = await requireAuth();
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  const occurrence = await prisma.scheduleOccurrence.findUnique({
    where: { id },
  });
  if (!occurrence) {
    return { error: "Séance non trouvée" };
  }
  try {
    await assertOccurrenceAccess(user, occurrence);
  } catch {
    return { error: "Action non autorisée" };
  }
  if (occurrence.date.getTime() < todayTunis().getTime()) {
    return { error: "Les séances passées ne peuvent pas être annulées" };
  }
  if (occurrence.status === "CANCELLED") {
    return { error: "Cette séance est déjà annulée" };
  }
  await prisma.scheduleOccurrence.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  const room = await prisma.classRoom.findUnique({
    where: { id: occurrence.classRoomId },
    select: { name: true },
  });
  await notifyClassParents(
    occurrence.classRoomId,
    `La séance « ${occurrence.title} » du ${occurrence.date.toISOString().slice(0, 10)} (${room?.name ?? ""}) est annulée.`,
    "OCCURRENCE_CANCELLED",
    `/calendrier`
  );
  return { success: true };
}
