import {
  getTimetableVersion,
  getActivityOptions,
} from "@/app/actions/planning";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlanningEditor from "./PlanningEditor";
import VersionActions from "./VersionActions";

export const instant = false;

function formatDay(date: Date | null): string {
  if (!date) return "…";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function TimetableVersionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const versionId = parseInt(id);

  let version: Awaited<ReturnType<typeof getTimetableVersion>> | null = null;
  try {
    version = await getTimetableVersion(versionId);
  } catch {
    notFound();
  }

  const activities = await getActivityOptions();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {version.label}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Valide du {formatDay(version.validFrom)} au{" "}
                  {formatDay(version.validTo)}
                  {!version.isActive && " — version inactive"}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Link
                  href="/planning"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                >
                  ← Retour
                </Link>
                <Link
                  href={`/planning/${version.id}/modifier`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Modifier la version
                </Link>
                <VersionActions versionId={version.id} />
              </div>
            </div>
          </div>

          <PlanningEditor
            timetableId={version.id}
            slots={version.slots}
            activities={activities}
          />
        </div>
      </main>
    </div>
  );
}
