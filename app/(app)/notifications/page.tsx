import {
  getMyNotifications,
  getAllUsers,
} from "@/app/actions/communication";
import { requireAuthPage } from "@/lib/auth";
import NotificationsManager from "./NotificationsManager";

export const instant = false;

export default async function NotificationsPage() {
  const user = await requireAuthPage();
  const notifications = await getMyNotifications();
  const users = user.role === "ADMIN" ? await getAllUsers() : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <NotificationsManager
          notifications={notifications}
          users={users}
          isAdmin={user.role === "ADMIN"}
        />
      </main>
    </div>
  );
}
