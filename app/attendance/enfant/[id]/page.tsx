"use client";

import { getChildAttendance } from "@/app/actions/attendance";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";

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

export default function ChildAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      }
    >
      <ChildAttendance />
    </Suspense>
  );
}

function ChildAttendance() {
  const params = useParams<{ id: string }>();
  const childId = parseInt(params.id);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getChildAttendance>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getChildAttendance(childId)
      .then(setData)
      .catch(() => setError("Accès refusé ou enfant introuvable"))
      .finally(() => setLoading(false));
  }, [childId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          {error || "Enfant non trouvé"}
        </p>
      </div>
    );
  }

  const { child, attendances } = data;
  const present = attendances.filter((a) => a.status === "PRESENT").length;
  const late = attendances.filter((a) => a.status === "LATE").length;
  const absences = attendances.filter((a) => a.status.startsWith("ABSENT")).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/attendance" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - {child.firstName} {child.lastName}
            </h1>
            <Link
              href={`/sante/${child.id}`}
              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
            >
              Santé &amp; sécurité
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Classe</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {child.classRoom?.name || "Non assigné"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Jours enregistrés</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {attendances.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Présences</p>
                <p className="text-lg font-medium text-green-600">
                  {present + late}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Absences</p>
                <p className="text-lg font-medium text-red-600">{absences}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Historique des présences
            </h2>
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
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Arrivée
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Départ
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Déclaration
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
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatTime(record.arrivalTime)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatTime(record.departureTime)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {record.absenceDeclaration
                            ? `${record.absenceDeclaration.status}${
                                record.absenceDeclaration.reason
                                  ? ` - ${record.absenceDeclaration.reason}`
                                  : ""
                              }`
                            : "-"}
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
