import { getAttendanceHistory } from "@/app/actions/attendance";
import Link from "next/link";

export const instant = false;

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Présent",
  ABSENT_DECLARED: "Absent (déclaré)",
  ABSENT_UNEXCUSED: "Absent (non excusé)",
  LATE: "En retard",
};

function formatTime(date: Date | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AttendanceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    child?: string;
    classRoomId?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;

  const attendances = await getAttendanceHistory({
    childName: params.child || undefined,
    classRoomId: params.classRoomId ? parseInt(params.classRoomId) : undefined,
    from: params.from || undefined,
    to: params.to || undefined,
  });

  const total = attendances.length;
  const present = attendances.filter((a) => a.status === "PRESENT").length;
  const late = attendances.filter((a) => a.status === "LATE").length;
  const absences = attendances.filter((a) =>
    a.status.startsWith("ABSENT")
  ).length;
  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/attendance" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Historique des présences
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Enregistrements</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Taux de présence</p>
              <p className="text-2xl font-bold text-green-600">{rate}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Absences</p>
              <p className="text-2xl font-bold text-red-600">{absences}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Retards</p>
              <p className="text-2xl font-bold text-amber-600">{late}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <form method="GET" className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                name="child"
                placeholder="Nom de l'enfant..."
                defaultValue={params.child || ""}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
              <input
                type="date"
                name="from"
                defaultValue={params.from || ""}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
              <input
                type="date"
                name="to"
                defaultValue={params.to || ""}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Filtrer
              </button>
            </form>
          </div>

          {/* Records */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            {attendances.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                Aucun enregistrement de présence
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Enfant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Classe
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Arrivée
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Départ
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Enregistré par
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {attendances.map((record) => (
                      <tr key={record.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(record.date).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            href={`/attendance/enfant/${record.child.id}`}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                          >
                            {record.child.firstName} {record.child.lastName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {record.child.classRoom?.name || "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              record.status === "PRESENT"
                                ? "bg-green-100 text-green-800"
                                : record.status === "LATE"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {STATUS_LABELS[record.status] || record.status}
                          </span>
                          {record.absenceDeclaration && (
                            <span className="ml-1 text-xs text-gray-400">
                              ({record.absenceDeclaration.status})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatTime(record.arrivalTime)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatTime(record.departureTime)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {record.recorder.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
