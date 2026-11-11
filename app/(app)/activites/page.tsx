import { getActivities } from "@/app/actions/activities";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/schedule-constants";
import { requireAuthPage } from "@/lib/auth";
import Link from "next/link";

export const instant = false;

const CATEGORY_COLORS: Record<string, string> = {
  EDUCATIONAL: "bg-indigo-100 text-indigo-800",
  CARE: "bg-rose-100 text-rose-800",
  CLUB: "bg-amber-100 text-amber-800",
  OTHER: "bg-gray-100 text-gray-600",
};

export default async function ActivitiesPage() {
  const user = await requireAuthPage();
  const activities = await getActivities();
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Activités
              </h2>
              {isAdmin && (
                <Link
                  href="/activites/nouveau"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  + Nouvelle activité
                </Link>
              )}
            </div>

            {activities.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                Aucune activité enregistrée
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activities.map((a) => (
                  <Link
                    key={a.id}
                    href={`/activites/${a.id}`}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {a.title}
                      </p>
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${CATEGORY_COLORS[a.category] ?? CATEGORY_COLORS.OTHER}`}
                      >
                        {ACTIVITY_CATEGORY_LABELS[a.category as keyof typeof ACTIVITY_CATEGORY_LABELS] ?? a.category}
                      </span>
                    </div>
                    {a.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {a.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {a._count.schedules} planification{a._count.schedules > 1 ? "s" : ""} —{" "}
                      {a.isActive ? "Active" : "Inactive"}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
