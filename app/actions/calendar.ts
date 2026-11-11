"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getParentChildIds, getEducatorClassRoomIds } from "@/lib/permissions";
import { parseDay } from "@/lib/dates";

// Resolve which children the current user may see in the calendar.
async function scopedChildIds(userId: number, role: string): Promise<number[]> {
  if (role === "ADMIN") {
    const all = await prisma.child.findMany({ select: { id: true } });
    return all.map((c) => c.id);
  }
  if (role === "PARENT") return getParentChildIds(userId);
  const roomIds = await getEducatorClassRoomIds(userId);
  if (roomIds.length === 0) return [];
  const children = await prisma.child.findMany({
    where: { classRoomId: { in: roomIds } },
    select: { id: true },
  });
  return children.map((c) => c.id);
}

export async function getCalendarChildren() {
  const user = await requireAuth();
  const ids = await scopedChildIds(user.id, user.role);
  if (ids.length === 0) return [];
  return prisma.child.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true, classRoom: { select: { name: true } } },
    orderBy: [{ classRoomId: "asc" }, { lastName: "asc" }],
  });
}

type DayBucket = {
  date: string;
  photos: { id: number; caption: string | null; childId: number | null; occurrenceId: number | null }[];
  attendances: {
    childId: number;
    status: string;
    arrivalTime: Date | null;
    departureTime: Date | null;
  }[];
  occurrences: {
    id: number;
    title: string;
    startMinutes: number;
    endMinutes: number;
    kind: string;
    status: string;
    educatorNote: string | null;
    noteVisibleToParents: boolean;
    classRoomId: number;
    activityTitle: string | null;
    participations: {
      childId: number;
      status: string;
      minutes: number | null;
      educatorRemark: string | null;
      remarkVisibleToParents: boolean;
    }[];
  }[];
};

export async function getCalendarRange(fromValue: string, toValue: string, childIds?: number[]) {
  const user = await requireAuth();
  const from = parseDay(fromValue);
  const to = parseDay(toValue);
  if (!from || !to || from > to) return { days: [] as DayBucket[], children: [] as { id: number; firstName: string; lastName: string; classRoom: { name: string } | null }[], clubs: [] as { childId: number; activityTitle: string }[] };

  const scoped = await scopedChildIds(user.id, user.role);
  const visible = childIds?.length ? childIds.filter((id) => scoped.includes(id)) : scoped;
  if (visible.length === 0) return { days: [] as DayBucket[], children: [], clubs: [] };

  const children = await prisma.child.findMany({
    where: { id: { in: visible } },
    select: { id: true, firstName: true, lastName: true, classRoomId: true, classRoom: { select: { name: true } } },
    orderBy: [{ classRoomId: "asc" }, { lastName: "asc" }],
  });
  const classRoomIds = [...new Set(children.map((c) => c.classRoomId).filter((x): x is number => x != null))];

  const [attendances, occurrences, photos, enrollments] = await Promise.all([
    prisma.attendance.findMany({
      where: { childId: { in: visible }, date: { gte: from, lte: to } },
      select: { childId: true, date: true, status: true, arrivalTime: true, departureTime: true },
    }),
    classRoomIds.length
      ? prisma.scheduleOccurrence.findMany({
          where: { classRoomId: { in: classRoomIds }, date: { gte: from, lte: to } },
          include: {
            activity: { select: { title: true } },
            participations: {
              where: { childId: { in: visible } },
              select: {
                childId: true, status: true,
                manualMinutes: true, autoMinutes: true,
                educatorRemark: true, remarkVisibleToParents: true,
              },
            },
          },
          orderBy: [{ date: "asc" }, { startMinutes: "asc" }],
        })
      : Promise.resolve([]),
    prisma.photo.findMany({
      where: {
        OR: [
          { classId: { in: classRoomIds } },
          { occurrence: { classRoomId: { in: classRoomIds } } },
          { childId: { in: visible } },
        ],
        createdAt: { gte: from, lt: new Date(to.getTime() + 86400000) },
        ...(user.role === "PARENT" ? { audience: "CLASS_CHILDREN" as const } : {}),
      },
      select: { id: true, caption: true, childId: true, occurrenceId: true, createdAt: true, classId: true, occurrence: { select: { classRoomId: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.clubEnrollment.findMany({
      where: { childId: { in: visible }, status: "APPROVED" },
      include: { activity: { select: { title: true } } },
    }),
  ]);

  const byDate = new Map<string, DayBucket>();
  const key = (d: Date) => d.toISOString().slice(0, 10);
  for (const a of attendances) {
    const k = key(a.date);
    if (!byDate.has(k)) byDate.set(k, { date: k, photos: [], attendances: [], occurrences: [] });
    byDate.get(k)!.attendances.push({
      childId: a.childId, status: a.status, arrivalTime: a.arrivalTime, departureTime: a.departureTime,
    });
  }
  for (const o of occurrences) {
    const k = key(o.date);
    if (!byDate.has(k)) byDate.set(k, { date: k, photos: [], attendances: [], occurrences: [] });
    byDate.get(k)!.occurrences.push({
      id: o.id,
      title: o.title,
      startMinutes: o.startMinutes,
      endMinutes: o.endMinutes,
      kind: o.kind,
      status: o.status,
      educatorNote: o.educatorNote,
      noteVisibleToParents: o.noteVisibleToParents,
      classRoomId: o.classRoomId,
      activityTitle: o.activity?.title ?? null,
      participations: o.participations.map((p) => ({
        childId: p.childId,
        status: p.status,
        minutes: p.manualMinutes ?? p.autoMinutes ?? null,
        educatorRemark: p.educatorRemark,
        remarkVisibleToParents: p.remarkVisibleToParents,
      })),
    });
  }

  for (const p of photos) {
    const k = key(p.createdAt);
    if (!byDate.has(k)) byDate.set(k, { date: k, photos: [], attendances: [], occurrences: [] });
    byDate.get(k)!.photos.push({
      id: p.id, caption: p.caption, childId: p.childId, occurrenceId: p.occurrenceId,
    });
  }

  const clubs = enrollments.map((e) => ({
    childId: e.childId,
    activityTitle: e.activity.title,
  }));

  return { days: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)), children, clubs };
}
