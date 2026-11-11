import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEducatorClassRoomIds, getParentChildIds } from "@/lib/permissions";
import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "gallery");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });

  const { id } = await params;
  const photoId = parseInt(id);
  if (!Number.isInteger(photoId)) return new NextResponse("Introuvable", { status: 404 });

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { occurrence: { select: { classRoomId: true } } },
  });
  if (!photo) return new NextResponse("Introuvable", { status: 404 });

  const roomId = photo.occurrence?.classRoomId ?? photo.classId;
  let allowed = false;
  if (user.role === "ADMIN") {
    allowed = true;
  } else if (user.role === "EDUCATOR") {
    const rooms = await getEducatorClassRoomIds(user.id);
    allowed = roomId != null && rooms.includes(roomId);
  } else {
    if (photo.audience === "CLASS_CHILDREN") {
      if (photo.childId != null) {
        allowed = (await getParentChildIds(user.id)).includes(photo.childId);
      }
      if (!allowed && roomId != null) {
        const myChildren = await prisma.child.findMany({
          where: { guardians: { some: { guardian: { userId: user.id } } } },
          select: { classRoomId: true },
        });
        allowed = myChildren.some((c) => c.classRoomId === roomId);
      }
    }
  }
  if (!allowed) return new NextResponse("Accès refusé", { status: 403 });

  // filePath is a bare filename inside UPLOAD_DIR — prevent traversal
  const safe = path.basename(photo.filePath);
  const file = await fs.readFile(path.join(UPLOAD_DIR, safe)).catch(() => null);
  if (!file) return new NextResponse("Fichier introuvable", { status: 404 });

  const ext = safe.split(".").pop()?.toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
