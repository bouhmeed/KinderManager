import { prisma } from "@/lib/prisma";

// Notify all parent users who have a child in the given class room.
// Dedupes against unread notifications with same type+href per user.
export async function notifyClassParents(
  classRoomId: number,
  message: string,
  type: string,
  href: string
) {
  const links = await prisma.childGuardian.findMany({
    where: { child: { classRoomId } },
    include: { guardian: { select: { userId: true } } },
  });
  const userIds = [...new Set(links.map((l) => l.guardian.userId).filter((x): x is number => x != null))];
  for (const userId of userIds) {
    const existing = await prisma.notification.findFirst({
      where: { userId, type, href, status: "UNREAD" },
    });
    if (!existing) {
      await prisma.notification.create({
        data: { userId, message, type, href, status: "UNREAD" },
      });
    }
  }
}

export async function notifyUserOnce(
  userId: number | null | undefined,
  message: string,
  type: string,
  href: string
) {
  if (!userId) return;
  const existing = await prisma.notification.findFirst({
    where: { userId, type, href, status: "UNREAD" },
  });
  if (!existing) {
    await prisma.notification.create({
      data: { userId, message, type, href, status: "UNREAD" },
    });
  }
}
