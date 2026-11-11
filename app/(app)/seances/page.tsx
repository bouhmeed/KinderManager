"use client";

import { getOccurrences, getClassRoomOptions } from "@/app/actions/activities";
import { minutesToHHMM } from "@/lib/tunis-time";
import { todayTunis, dayKeyTunis } from "@/lib/dates";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planifiée",
  CANCELLED: "Annulée",
  COMPLETED: "Terminée",
};
const STATUS_COLORS: Record<string, string> = {
  PLANNED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-700",
  COMPLETED: "bg-green-100 text-green-800",
};

export default function SessionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><p>Chargement...</p></div>}>
      <SessionsBrowser />
    </Suspense>
  );
}

function SessionsBrowser() {
  const [classRooms, setClassRooms] = useState<{ id: number; name: string }[]>([]);
  const [classRoomId, setClassRoomId] = useState("");
  const [date, setDate] = useState(dayKeyTunis(todayTunis()));
  const [occurrences, setOccurrences] = useState<Awaited<ReturnType<typeof getOccurrences>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClassRoomOptions().then(setClassRooms).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    getOccurrences({
      classRoomId: classRoomId ? parseInt(classRoomId) : undefined,
      date,
    })
      .then((res) => { if (alive) setOccurrences(res); })
      .catch(() => { if (alive) setOccurrences([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [classRoomId, date]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Séances</h2>
              <div className="flex items-center gap-3">
                <select
                  value={classRoomId}
                  onChange={(e) => { setLoading(true); setClassRoomId(e.target.value); }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Toutes les classes</option>
                  {classRooms.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => { setLoading(true); setDate(e.target.value); }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {loading ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">Chargement...</p>
            ) : occurrences.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                Aucune séance pour cette date
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Horaire</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Séance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Classe</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {occurrences.map((o) => (
                      <tr key={o.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {minutesToHHMM(o.startMinutes)} – {minutesToHHMM(o.endMinutes)}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/seances/${o.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
                            {o.title}
                          </Link>
                          {o.educator && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{o.educator.user.name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{o.classRoom.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {o.kind === "TIMETABLE_SLOT" ? "Créneau" : o.kind === "CLUB_SESSION" ? "Club" : "Activité"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[o.status]}`}>
                            {STATUS_LABELS[o.status]}
                          </span>
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
