"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { canAccessClassRoom } from "@/lib/permissions";
import { parseDay } from "@/lib/dates";
import { WEEKDAYS, SLOT_KINDS } from "@/lib/schedule-constants";
import type { Weekday, TimetableSlotKind } from "@/generated/prisma/enums";
import {
  resolveClassSchedule,
  rangesOverlap,
  intersectionHasWeekday,
} from "@/lib/schedule-resolver";
import {
  syncClassOccurrences,
  occurrenceHorizon,
} from "@/lib/occurrences";

// ---------- Reads ----------

export async function getScheduleExceptions(classRoomId?: number) {
  const user = await requireAuth();

  if (user.role === "EDUCATOR" && classRoomId) {
    if (!(await canAccessClassRoom(user, classRoomId))) {
      throw new Error("Forbidden");
    }
  } else if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  return prisma.classScheduleException.findMany({
    where: classRoomId ? { classRoomId } : {},
    orderBy: [{ validFrom: "desc" }, { id: "desc" }],
    include: {
      classRoom: { select: { id: true, name: true } },
      creator: { select: { name: true } },
      items: {
        include: {
          sourceSlot: { select: { id: true, title: true, weekday: true } },
          activity: { select: { id: true, title: true } },
        },
      },
    },
    take: 200,
  });
}

// All timetable slots across versions — used by the exception editor
// to pick the global slot a MODIFY/REMOVE item targets.
export async function getTimetableSlotOptions() {
  await requireAuth();
  return prisma.timetableSlot.findMany({
    orderBy: [{ timetableId: "asc" }, { weekday: "asc" }, { position: "asc" }],
    include: {
      timetable: { select: { id: true, label: true } },
      activity: { select: { id: true, title: true } },
    },
  });
}

export async function getClassRoomsForExceptions() {
  await requireRole("ADMIN");
  return prisma.classRoom.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

// Resolved schedule of a class for one day (for display).
export async function getResolvedClassSchedule(
  classRoomId: number,
  dateValue: string
) {
  const user = await requireAuth();
  if (!(await canAccessClassRoom(user, classRoomId))) {
    throw new Error("Forbidden");
  }

  const date = parseDay(dateValue);
  if (!date) {
    throw new Error("Date invalide");
  }

  const classRoom = await prisma.classRoom.findUnique({
    where: { id: classRoomId },
    select: { id: true, name: true },
  });
  if (!classRoom) {
    throw new Error("Classe non trouvée");
  }

  const slots = await resolveClassSchedule(classRoomId, date);
  return { classRoom, date: dateValue, slots };
}

// ---------- Writes (ADMIN) ----------

interface ExceptionItemInput {
  action: string;
  sourceSlotId?: number | null;
  weekday?: string | null;
  kind?: string | null;
  title?: string | null;
  startMinutes?: number | null;
  endMinutes?: number | null;
  activityId?: number | null;
  notes?: string | null;
}

interface ExceptionInput {
  classRoomId: number;
  validFrom: string;
  validTo: string;
  reason?: string | null;
  items: ExceptionItemInput[];
}

function parseExceptionInput(input: ExceptionInput) {
  const classRoomId = input.classRoomId;
  const validFrom = parseDay(input.validFrom || "");
  const validTo = parseDay(input.validTo || "");
  const reason = (input.reason || "").trim() || null;

  if (
    !Number.isInteger(classRoomId) ||
    !validFrom ||
    !validTo ||
    validTo < validFrom ||
    !Array.isArray(input.items)
  ) {
    return { error: "Paramètres invalides" };
  }

  const items = [];
  for (const raw of input.items) {
    if (raw.action === "MODIFY_SLOT" || raw.action === "REMOVE_SLOT") {
      if (!Number.isInteger(raw.sourceSlotId)) {
        return { error: "Créneau global manquant pour une modification/suppression" };
      }
      items.push({
        action: raw.action,
        sourceSlotId: raw.sourceSlotId!,
        weekday: null,
        kind: null,
        title: null,
        startMinutes: null,
        endMinutes: null,
        activityId: null,
        notes: null,
        // MODIFY carries the full replacement values; REMOVE ignores them.
        ...(raw.action === "MODIFY_SLOT"
          ? {
              kind: raw.kind ?? null,
              title: (raw.title || "").trim() || null,
              startMinutes: raw.startMinutes ?? null,
              endMinutes: raw.endMinutes ?? null,
              activityId: raw.activityId ?? null,
              notes: (raw.notes || "").trim() || null,
            }
          : {}),
      });
    } else if (raw.action === "ADD_SLOT") {
      const weekday = raw.weekday as Weekday | null;
      const kind = (raw.kind || "OTHER") as TimetableSlotKind;
      const title = (raw.title || "").trim();
      if (
        !weekday ||
        !WEEKDAYS.includes(weekday) ||
        !SLOT_KINDS.includes(kind) ||
        !title ||
        !Number.isInteger(raw.startMinutes) ||
        !Number.isInteger(raw.endMinutes) ||
        (raw.startMinutes ?? -1) < 0 ||
        (raw.endMinutes ?? 0) > 1440 ||
        (raw.startMinutes ?? 0) >= (raw.endMinutes ?? 0)
      ) {
        return { error: "Créneau ajouté invalide" };
      }
      items.push({
        action: "ADD_SLOT",
        sourceSlotId: null,
        weekday,
        kind,
        title,
        startMinutes: raw.startMinutes!,
        endMinutes: raw.endMinutes!,
        activityId: raw.activityId ?? null,
        notes: (raw.notes || "").trim() || null,
      });
    } else {
      return { error: "Action d'exception invalide" };
    }
  }

  if (items.length === 0) {
    return { error: "Au moins une modification est requise" };
  }

  return { classRoomId, validFrom, validTo, reason, items };
}

// Conflict rules:
// - Two exceptions of the same class may overlap in time only if they
//   touch different slots.
// - MODIFY_SLOT and REMOVE_SLOT on the same source slot conflict when
//   the date ranges intersect on the slot's weekday.
// - ADD_SLOT conflicts with another ADD_SLOT on the same weekday with
//   overlapping times, when the ranges intersect on that weekday.
async function findExceptionConflict(
  classRoomId: number,
  validFrom: Date,
  validTo: Date,
  items: {
    action: string;
    sourceSlotId: number | null;
    weekday: Weekday | null;
    startMinutes: number | null;
    endMinutes: number | null;
  }[],
  excludeId?: number
): Promise<string | null> {
  const existing = await prisma.classScheduleException.findMany({
    where: {
      classRoomId,
      validFrom: { lte: validTo },
      validTo: { gte: validFrom },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: {
      items: true,
    },
  });

  const sourceSlotWeekdays = new Map<number, Weekday>();
  const sourceSlotIds = [
    ...new Set(
      items
        .map((i) => i.sourceSlotId)
        .filter((v): v is number => v !== null)
    ),
  ];
  if (sourceSlotIds.length > 0) {
    const slots = await prisma.timetableSlot.findMany({
      where: { id: { in: sourceSlotIds } },
      select: { id: true, weekday: true },
    });
    for (const s of slots) {
      sourceSlotWeekdays.set(s.id, s.weekday);
    }
  }

  for (const ex of existing) {
    if (!rangesOverlap(validFrom, validTo, ex.validFrom, ex.validTo)) {
      continue;
    }
    for (const item of items) {
      for (const other of ex.items) {
        const touchesSameSource =
          item.sourceSlotId !== null &&
          other.sourceSlotId !== null &&
          item.sourceSlotId === other.sourceSlotId &&
          (item.action === "MODIFY_SLOT" || item.action === "REMOVE_SLOT") &&
          (other.action === "MODIFY_SLOT" || other.action === "REMOVE_SLOT");
        if (touchesSameSource) {
          const weekday = sourceSlotWeekdays.get(item.sourceSlotId!);
          if (
            !weekday ||
            intersectionHasWeekday(validFrom, validTo, ex.validFrom, ex.validTo, weekday)
          ) {
            return `Conflit avec l'exception du ${ex.validFrom.toLocaleDateString("fr-FR")} : même créneau ciblé sur une date commune`;
          }
        }

        const bothAdd =
          item.action === "ADD_SLOT" &&
          other.action === "ADD_SLOT" &&
          item.weekday !== null &&
          other.weekday === item.weekday &&
          item.startMinutes !== null &&
          item.endMinutes !== null &&
          other.startMinutes !== null &&
          other.endMinutes !== null &&
          item.startMinutes < other.endMinutes &&
          other.startMinutes < item.endMinutes;
        if (
          bothAdd &&
          intersectionHasWeekday(
            validFrom,
            validTo,
            ex.validFrom,
            ex.validTo,
            item.weekday!
          )
        ) {
          return `Conflit avec l'exception du ${ex.validFrom.toLocaleDateString("fr-FR")} : créneau ajouté chevauchant sur ${item.weekday}`;
        }
      }
    }
  }
  return null;
}

async function validateExceptionItems(
  items: {
    action: string;
    sourceSlotId: number | null;
    activityId: number | null;
  }[]
): Promise<string | null> {
  const sourceIds = [
    ...new Set(
      items
        .map((i) => i.sourceSlotId)
        .filter((v): v is number => v !== null)
    ),
  ];
  if (sourceIds.length > 0) {
    const count = await prisma.timetableSlot.count({
      where: { id: { in: sourceIds } },
    });
    if (count !== sourceIds.length) {
      return "Un ou plusieurs créneaux globaux sont introuvables";
    }
  }
  const activityIds = [
    ...new Set(
      items
        .map((i) => i.activityId)
        .filter((v): v is number => v !== null)
    ),
  ];
  if (activityIds.length > 0) {
    const count = await prisma.activity.count({
      where: { id: { in: activityIds } },
    });
    if (count !== activityIds.length) {
      return "Une ou plusieurs activités sont introuvables";
    }
  }
  return null;
}

export async function createScheduleException(input: ExceptionInput) {
  const user = await requireRole("ADMIN");

  const parsed = parseExceptionInput(input);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const classRoom = await prisma.classRoom.findUnique({
    where: { id: parsed.classRoomId },
  });
  if (!classRoom) {
    return { error: "Classe non trouvée" };
  }

  const itemError = await validateExceptionItems(parsed.items);
  if (itemError) {
    return { error: itemError };
  }

  const conflict = await findExceptionConflict(
    parsed.classRoomId,
    parsed.validFrom,
    parsed.validTo,
    parsed.items
  );
  if (conflict) {
    return { error: conflict };
  }

  const exception = await prisma.classScheduleException.create({
    data: {
      classRoomId: parsed.classRoomId,
      validFrom: parsed.validFrom,
      validTo: parsed.validTo,
      reason: parsed.reason,
      createdBy: user.id,
      items: {
        create: parsed.items.map((i) => ({
          action: i.action as "MODIFY_SLOT" | "REMOVE_SLOT" | "ADD_SLOT",
          sourceSlotId: i.sourceSlotId,
          weekday: i.weekday,
          kind: i.kind as TimetableSlotKind | null,
          title: i.title,
          startMinutes: i.startMinutes,
          endMinutes: i.endMinutes,
          activityId: i.activityId,
          notes: i.notes,
        })),
      },
    },
  });

  const { from, to } = occurrenceHorizon();
  await syncClassOccurrences(parsed.classRoomId, from, to);
  return { success: true, exception };
}

export async function updateScheduleException(
  id: number,
  input: ExceptionInput
) {
  await requireRole("ADMIN");

  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }

  const existing = await prisma.classScheduleException.findUnique({
    where: { id },
  });
  if (!existing) {
    return { error: "Exception non trouvée" };
  }

  const parsed = parseExceptionInput(input);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const itemError = await validateExceptionItems(parsed.items);
  if (itemError) {
    return { error: itemError };
  }

  const conflict = await findExceptionConflict(
    parsed.classRoomId,
    parsed.validFrom,
    parsed.validTo,
    parsed.items,
    id
  );
  if (conflict) {
    return { error: conflict };
  }

  const exception = await prisma.$transaction(async (tx) => {
    await tx.scheduleExceptionItem.deleteMany({
      where: { exceptionId: id },
    });
    return tx.classScheduleException.update({
      where: { id },
      data: {
        classRoomId: parsed.classRoomId,
        validFrom: parsed.validFrom,
        validTo: parsed.validTo,
        reason: parsed.reason,
        items: {
          create: parsed.items.map((i) => ({
            action: i.action as "MODIFY_SLOT" | "REMOVE_SLOT" | "ADD_SLOT",
            sourceSlotId: i.sourceSlotId,
            weekday: i.weekday,
            kind: i.kind as TimetableSlotKind | null,
            title: i.title,
            startMinutes: i.startMinutes,
            endMinutes: i.endMinutes,
            activityId: i.activityId,
            notes: i.notes,
          })),
        },
      },
    });
  });

  const { from, to } = occurrenceHorizon();
  await syncClassOccurrences(parsed.classRoomId, from, to);
  return { success: true, exception };
}

export async function deleteScheduleException(id: number) {
  await requireRole("ADMIN");

  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }

  const existing = await prisma.classScheduleException.findUnique({
    where: { id },
  });
  if (!existing) {
    return { error: "Exception non trouvée" };
  }

  await prisma.classScheduleException.delete({ where: { id } });
  const { from, to } = occurrenceHorizon();
  await syncClassOccurrences(existing.classRoomId, from, to);
  return { success: true };
}
