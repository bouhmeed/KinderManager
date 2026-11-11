import { getAnnouncements } from "@/app/actions/communication";
import { requireAuthPage } from "@/lib/auth";
import AnnouncementsManager from "./AnnouncementsManager";

export const instant = false;

export default async function AnnoncesPage() {
  const user = await requireAuthPage();
  const announcements = await getAnnouncements();
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <AnnouncementsManager
          announcements={announcements}
          isAdmin={isAdmin}
        />
      </main>
    </div>
  );
}
