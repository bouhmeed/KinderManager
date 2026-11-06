import { getRequestableChildren } from "@/app/actions/communication";
import { requireAuthPage } from "@/lib/auth";
import RequestForm from "./RequestForm";
import Link from "next/link";

export const instant = false;

export default async function NewRequestPage() {
  const user = await requireAuthPage();

  if (user.role !== "PARENT" && user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          Action non autorisée
        </p>
      </div>
    );
  }

  const children = await getRequestableChildren();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/demandes" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Nouvelle demande
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <RequestForm childOptions={children} />
      </main>
    </div>
  );
}
