import {
  getMessageableUsers,
  getRequestableChildren,
} from "@/app/actions/communication";
import { requireAuthPage } from "@/lib/auth";
import Link from "next/link";
import NewConversationForm from "./NewConversationForm";

export const instant = false;

export default async function NewConversationPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const user = await requireAuthPage();
  const params = await searchParams;
  const childId = params.childId ? parseInt(params.childId) : undefined;

  const [users, children] = await Promise.all([
    getMessageableUsers(childId),
    user.role === "PARENT" || user.role === "EDUCATOR" || user.role === "ADMIN"
      ? getRequestableChildren()
      : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/messages" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Nouvelle conversation
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <NewConversationForm
          users={users}
          childOptions={children}
          initialChildId={childId}
        />
      </main>
    </div>
  );
}
