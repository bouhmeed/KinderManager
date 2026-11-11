"use client";

import { getResolvedClassSchedule } from "@/app/actions/exceptions";
import { minutesToHHMM } from "@/lib/tunis-time";
import { todayTunis, dayKeyTunis } from "@/lib/dates";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

const KIND_LABELS: Record<string, string> = {
  ACTIVITY: "Activité",
  MEAL: "Repas",
  NAP: "Sieste",
  BREAK: "Pause",
  ARRIVAL: "Arrivée",
  DEPARTURE: "Départ",
  OTHER: "Autre",
};

export default function ClassSchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      }
    >
      <ClassSchedule />
    </Suspense>
  );
}

function ClassSchedule() {
  const params = useParams<{ id: string }>();
  const classRoomId = parseInt(params.id);
  const [date, setDate] = useState(dayKeyTunis(todayTunis()));
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getResolvedClassSchedule>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getResolvedClassSchedule(classRoomId, date)
      .then((res) => { if (alive) setData(res); })
      .catch(() => { if (alive) setError("Accès refusé ou classe introuvable"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [classRoomId, date]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data ? `Planning — ${data.classRoom.name}` : "Planning de la classe"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Planning effectif (global + exceptions)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/planning"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400"
                >
                  ← Planning
                </Link>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => { setLoading(true); setDate(e.target.value); }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {loading ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                Chargement...
              </p>
            ) : error ? (
              <p className="text-red-600 dark:text-red-400 text-center py-12">{error}</p>
            ) : !data || data.slots.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                Aucun créneau pour cette date
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.slots.map((slot) => (
                  <li key={slot.refId} className="py-3 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-28">
                      {minutesToHHMM(slot.startMinutes)} – {minutesToHHMM(slot.endMinutes)}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {KIND_LABELS[slot.kind] ?? slot.kind}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {slot.title}
                        {slot.activityTitle && (
                          <span className="ml-2 text-xs font-normal text-indigo-600 dark:text-indigo-400">
                            ({slot.activityTitle})
                          </span>
                        )}
                        {slot.source === "EXCEPTION" && (
                          <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                            [exception classe]
                          </span>
                        )}
                      </p>
                      {slot.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{slot.notes}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
