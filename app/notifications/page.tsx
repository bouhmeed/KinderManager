import {
  getMyNotifications,
  getAllUsers,
} from "@/app/actions/communication";
import { requireAuthPage } from "@/lib/auth";
import Link from "next/link";
import NotificationsManager from "./NotificationsManager";

export const instant = false;

export default async function NotificationsPage() {
  const user = await requireAuthPage();
  const notifications = await getMyNotifications();
  const users = user.role === "ADMIN" ? await getAllUsers() : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/dashboard" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Notifications
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

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
