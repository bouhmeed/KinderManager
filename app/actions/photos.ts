"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getEducatorClassRoomIds, getParentChildIds } from "@/lib/permissions";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { notifyClassParents } from "@/lib/notify";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "gallery");
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
};

async function educatorRoomIds(userId: number) {
  return getEducatorClassRoomIds(userId);
}

// Resolve classIds a user may see photos for.
export async function getPhotoScope() {
  const user = await requireAuth();
  if (user.role === "ADMIN") return { role: user.role, classIds: null as number[] | null, childIds: null as number[] | null };
  if (user.role === "EDUCATOR") {
    return { role: user.role, classIds: await educatorRoomIds(user.id), childIds: null };
  }
  const childIds = await getParentChildIds(user.id);
  const children = await prisma.child.findMany({
    where: { id: { in: childIds } },
    select: { classRoomId: true },
  });
  return {
    role: user.role,
    classIds: [...new Set(children.map((c) => c.classRoomId).filter((x): x is number => x != null))],
    childIds,
  };
}

function photoVisibleTo(scope: { role: string; classIds: number[] | null; childIds: number[] | null }, p: {
  audience: string; classId: number | null; childId: number | null;
  occurrence: { classRoomId: number } | null;
}) {
  const roomId = p.occurrence?.classRoomId ?? p.classId;
  if (scope.role === "ADMIN") return true;
  if (scope.role === "EDUCATOR") return roomId != null && (scope.classIds ?? []).includes(roomId);
  // PARENT
  if (p.audience !== "CLASS_CHILDREN") return false;
  if (p.childId != null && (scope.childIds ?? []).includes(p.childId)) return true;
  return roomId != null && (scope.classIds ?? []).includes(roomId);
}

export async function uploadPhoto(formData: FormData) {
  const user = await requireAuth();
  if (user.role === "PARENT") return { error: "Action réservée au personnel" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Aucun fichier sélectionné" };
  if (file.size > MAX_SIZE) return { error: "Photo trop lourde (maximum 5 Mo)" };
  const mime = file.type;
  if (!ALLOWED.has(mime)) return { error: "Format non supporté (JPEG, PNG, WebP, GIF)" };

  const classId = parseInt(formData.get("classId") as string);
  const childIdRaw = (formData.get("childId") as string) || "";
  const occurrenceIdRaw = (formData.get("occurrenceId") as string) || "";
  const caption = ((formData.get("caption") as string) || "").trim() || null;
  const audience = (formData.get("audience") as string) === "CLASS_CHILDREN" ? "CLASS_CHILDREN" : "STAFF_ONLY";
  const takenAtRaw = (formData.get("takenAt") as string) || "";

  if (!Number.isInteger(classId)) return { error: "Classe requise" };
  const childId = childIdRaw ? parseInt(childIdRaw) : null;
  const occurrenceId = occurrenceIdRaw ? parseInt(occurrenceIdRaw) : null;

  if (user.role === "EDUCATOR") {
    const rooms = await educatorRoomIds(user.id);
    if (!rooms.includes(classId)) return { error: "Classe non autorisée" };
  }
  const classRoom = await prisma.classRoom.findUnique({ where: { id: classId } });
  if (!classRoom) return { error: "Classe introuvable" };

  const buf = Buffer.from(await file.arrayBuffer());
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${EXT[mime]}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), buf);

  const photo = await prisma.photo.create({
    data: {
      filePath: name,
      caption,
      classId,
      childId: childId && Number.isInteger(childId) ? childId : null,
      occurrenceId: occurrenceId && Number.isInteger(occurrenceId) ? occurrenceId : null,
      audience: audience as "STAFF_ONLY" | "CLASS_CHILDREN",
      takenAt: takenAtRaw ? new Date(`${takenAtRaw}T12:00:00`) : null,
      uploadedBy: user.id,
    },
    include: { child: { select: { firstName: true, lastName: true } } },
  });
  if (audience === "CLASS_CHILDREN") {
    await notifyClassParents(
      classId,
      `Nouvelle(s) photo(s) dans la galerie de ${classRoom.name}.`,
      "NEW_PHOTOS",
      "/galerie"
    );
  }
  return { success: true, photo };
}

export async function getGalleryPhotos(filters: { classId?: number; date?: string; occurrenceId?: number; childId?: number }) {
  await requireAuth();
  const scope = await getPhotoScope();
  const where: Record<string, unknown> = {};
  if (scope.role === "EDUCATOR") where.OR = [{ classId: { in: scope.classIds ?? [] } }, { occurrence: { classRoomId: { in: scope.classIds ?? [] } } }];
  if (scope.role === "PARENT") {
    where.audience = "CLASS_CHILDREN";
    where.OR = [
      { childId: { in: scope.childIds ?? [] } },
      { classId: { in: scope.classIds ?? [] } },
      { occurrence: { classRoomId: { in: scope.classIds ?? [] } } },
    ];
  }
  if (filters.classId) where.classId = filters.classId;
  if (filters.occurrenceId) where.occurrenceId = filters.occurrenceId;
  if (filters.childId) where.childId = filters.childId;
  if (filters.date) {
    const d = new Date(`${filters.date}T00:00:00`);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    where.createdAt = { gte: d, lt: next };
  }
  const photos = await prisma.photo.findMany({
    where,
    include: {
      child: { select: { id: true, firstName: true, lastName: true } },
      classRoom: { select: { name: true } },
      occurrence: { select: { id: true, title: true, date: true, classRoomId: true } },
      uploader: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  // Final visibility check per photo (defense in depth)
  return photos.filter((p) =>
    photoVisibleTo(scope, { audience: p.audience, classId: p.classId, childId: p.childId, occurrence: p.occurrence })
  );
}

export async function deletePhoto(id: number) {
  const user = await requireAuth();
  if (user.role === "PARENT") return { error: "Action réservée au personnel" };
  const photo = await prisma.photo.findUnique({ where: { id }, include: { occurrence: { select: { classRoomId: true } } } });
  if (!photo) return { error: "Photo introuvable" };
  const roomId = photo.occurrence?.classRoomId ?? photo.classId;
  if (user.role === "EDUCATOR") {
    const rooms = await educatorRoomIds(user.id);
    if (roomId == null || !rooms.includes(roomId)) return { error: "Action non autorisée" };
  }
  await prisma.photo.delete({ where: { id } });
  await fs.unlink(path.join(UPLOAD_DIR, photo.filePath)).catch(() => {});
  return { success: true };
}
