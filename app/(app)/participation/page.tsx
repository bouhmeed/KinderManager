import { requireAuthPage } from "@/lib/auth";
import { getEducatorClassRoomIds } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import ParticipationBrowser from "./ParticipationBrowser";

export const instant = false;

export default async function ParticipationPage() {
  const user = await requireAuthPage();
  let classRooms: { id: number; name: string }[];
  if (user.role === "ADMIN") {
    classRooms = await prisma.classRoom.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  } else {
    const ids = await getEducatorClassRoomIds(user.id);
    classRooms = await prisma.classRoom.findMany({ where: { id: { in: ids } }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <ParticipationBrowser classRooms={classRooms} />
        </div>
      </main>
    </div>
  );
}
