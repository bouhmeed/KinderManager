import {
  getScheduleExceptions,
  getClassRoomsForExceptions,
} from "@/app/actions/exceptions";
import { requireAdminPage } from "@/lib/auth";
import Link from "next/link";
import DeleteExceptionButton from "./DeleteExceptionButton";

export const instant = false;

const ACTION_LABELS: Record<string, string> = {
  MODIFY_SLOT: "Modification",
  REMOVE_SLOT: "Suppression",
  ADD_SLOT: "Ajout",
};

function formatDay(date: Date): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function itemSummary(item: {
  action: string;
  sourceSlot: { title: string } | null;
  title: string | null;
  activity: { title: string } | null;
}): string {
  if (item.action === "ADD_SLOT") {
    return `Ajout « ${item.title ?? "?"} »${item.activity ? ` (${item.activity.title})` : ""}`;
  }
  const base = item.sourceSlot?.title ?? "créneau";
  if (item.action === "REMOVE_SLOT") {
    return `Retrait de « ${base} »`;
  }
  return `« ${base} » → « ${item.title ?? base} »${item.activity ? ` (${item.activity.title})` : ""}`;
}

export default async function ExceptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ classRoomId?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const classRoomId = params.classRoomId ? parseInt(params.classRoomId) : undefined;

  const [exceptions, classRooms] = await Promise.all([
    getScheduleExceptions(
      classRoomId && Number.isInteger(classRoomId) ? classRoomId : undefined
    ),
    getClassRoomsForExceptions(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Exceptions par classe
              </h2>
              <Link
                href="/planning/exceptions/nouveau"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                + Nouvelle exception
              </Link>
            </div>

            <form method="GET" className="flex gap-3 mb-6">
              <select
                name="classRoomId"
                defaultValue={params.classRoomId || ""}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="">Toutes les classes</option>
                {classRooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Filtrer
              </button>
            </form>

            {exceptions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                Aucune exception de planning
              </p>
            ) : (
              <div className="space-y-4">
                {exceptions.map((ex) => (
                  <div
                    key={ex.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {ex.classRoom.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Du {formatDay(ex.validFrom)} au {formatDay(ex.validTo)}
                          {ex.reason ? ` — ${ex.reason}` : ""}
                        </p>
                      </div>
                      <DeleteExceptionButton id={ex.id} />
                    </div>
                    <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      {ex.items.map((item) => (
                        <li key={item.id}>
                          <span className="inline-block px-2 py-0.5 mr-2 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            {ACTION_LABELS[item.action]}
                          </span>
                          {itemSummary(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
