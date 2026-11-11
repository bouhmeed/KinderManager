"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { assertClassRoomAccess, canAccessChild } from "@/lib/permissions";
import { notifyClassParents } from "@/lib/notify";
import { ensureParticipations } from "@/lib/participation";
import type { ParticipationStatus } from "@/generated/prisma/client";
import { z } from "zod";

export async function getOccurrenceParticipations(occurrenceId: number) {
  const user = await requireAuth();
  const occ = await prisma.scheduleOccurrence.findUnique({
    where: { id: occurrenceId },
    include: {
      classRoom: { select: { id: true, name: true } },
      activity: { select: { title: true, category: true } },
      educator: { select: { user: { select: { name: true } } } },
    },
  });
  if (!occ) return null;
  await assertClassRoomAccess(user, occ.classRoomId);
  await ensureParticipations([occurrenceId]);

  const participations = await prisma.activityParticipation.findMany({
    where: { occurrenceId },
    include: {
      child: { select: { id: true, firstName: true, lastName: true } },
      confirmer: { select: { name: true } },
      history: {
        orderBy: { changedAt: "desc" },
        include: { changer: { select: { name: true } } },
      },
    },
    orderBy: { child: { lastName: "asc" } },
  });

  return { occurrence: occ, participations };
}

const correctionSchema = z.object({
  status: z.enum(["PENDING", "PRESENT", "PARTIAL", "ABSENT", "CANCELLED"]),
  minutes: z.number().int().min(0).max(1440).nullable(),
  reason: z.string().trim().min(1, "Le motif est obligatoire"),
});

export async function correctParticipation(
  participationId: number,
  input: { status: string; minutes: number | null; reason: string }
) {
  const user = await requireAuth();
  const parsed = correctionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const p = await prisma.activityParticipation.findUnique({
    where: { id: participationId },
    include: {
      occurrence: { select: { classRoomId: true, tracksParticipation: true, status: true } },
    },
  });
  if (!p || !p.occurrence.tracksParticipation) return { error: "Participation introuvable" };
  await assertClassRoomAccess(user, p.occurrence.classRoomId);

  const oldEffective = p.manualStatus ?? p.autoStatus ?? "PENDING";
  const oldMinutes = p.manualMinutes ?? p.autoMinutes ?? null;

  const [, updated] = await prisma.$transaction([
    prisma.participationHistory.create({
      data: {
        participationId,
        oldStatus: oldEffective,
        newStatus: parsed.data.status as ParticipationStatus,
        oldMinutes,
        newMinutes: parsed.data.minutes,
        reason: parsed.data.reason,
        changedBy: user.id,
      },
    }),
    prisma.activityParticipation.update({
      where: { id: participationId },
      data: {
        manualStatus: parsed.data.status as ParticipationStatus,
        manualMinutes: parsed.data.minutes,
        status: parsed.data.status as ParticipationStatus,
        confirmedBy: user.id,
        confirmedAt: new Date(),
        overrideReason: parsed.data.reason,
      },
    }),
  ]);

  return { success: true, participation: updated };
}

export async function getParticipationHistory(participationId: number) {
  const user = await requireAuth();
  const p = await prisma.activityParticipation.findUnique({
    where: { id: participationId },
    include: { occurrence: { select: { classRoomId: true } } },
  });
  if (!p) return [];
  await assertClassRoomAccess(user, p.occurrence.classRoomId);
  return prisma.participationHistory.findMany({
    where: { participationId },
    orderBy: { changedAt: "desc" },
    include: { changer: { select: { name: true } } },
  });
}

export async function setParticipationRemark(
  participationId: number,
  remark: string,
  visibleToParents: boolean
) {
  const user = await requireAuth();
  const p = await prisma.activityParticipation.findUnique({
    where: { id: participationId },
    include: { occurrence: { select: { classRoomId: true } } },
  });
  if (!p) return { error: "Participation introuvable" };
  await assertClassRoomAccess(user, p.occurrence.classRoomId);
  const clean = remark.trim();
  if (clean.length > 1000) return { error: "Remarque trop longue" };
  const visible = visibleToParents && clean.length > 0;
  await prisma.activityParticipation.update({
    where: { id: participationId },
    data: {
      educatorRemark: clean || null,
      remarkVisibleToParents: visible,
    },
  });
  if (visible && !p.remarkVisibleToParents) {
    const occ = await prisma.scheduleOccurrence.findUnique({
      where: { id: p.occurrenceId },
      select: { title: true, date: true },
    });
    if (occ) {
      await notifyClassParents(
        p.occurrence.classRoomId,
        `Remarque de l'éducateur sur « ${occ.title} » du ${occ.date.toISOString().slice(0, 10)}.`,
        "PARTICIPATION_REMARK",
        "/calendrier"
      );
    }
  }
  return { success: true };
}

// Parent-facing read: only for own children.
export async function getChildParticipations(childId: number) {
  const user = await requireAuth();
  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { id: true, classRoomId: true },
  });
  if (!child || !(await canAccessChild(user, child))) return [];
  return prisma.activityParticipation.findMany({
    where: { childId },
    include: {
      occurrence: {
        select: {
          id: true, date: true, startMinutes: true, endMinutes: true,
          title: true, status: true, educatorNote: true, noteVisibleToParents: true,
          classRoom: { select: { name: true } },
          activity: { select: { title: true, color: true } },
        },
      },
    },
    orderBy: { occurrence: { date: "desc" } },
    take: 200,
  });
}
