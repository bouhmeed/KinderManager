import { getChildHealth } from "@/app/actions/health";
import { requireAuthPage } from "@/lib/auth";
import HealthSections from "./HealthSections";
import Link from "next/link";

export const instant = false;

export default async function ChildHealthPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuthPage();
  const { id } = await params;
  const childId = parseInt(id);

  let data;
  try {
    data = await getChildHealth(childId);
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          Enfant non trouvé ou accès refusé
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/dashboard" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Santé &amp; sécurité
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <HealthSections data={data} role={user.role} viewerId={user.id} />
      </main>
    </div>
  );
}
