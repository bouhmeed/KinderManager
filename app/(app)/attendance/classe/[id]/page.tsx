"use client";

import {
  getClassRoomAttendance,
  saveClassRoomAttendance,
} from "@/app/actions/attendance";
import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { todayTunis, dayKeyTunis } from "@/lib/dates";

const STATUS_OPTIONS = [
  { value: "", label: "— À vérifier" },
  { value: "PRESENT", label: "Présent" },
  { value: "LATE", label: "En retard" },
  { value: "ABSENT_EXCUSED", label: "Absent excusé" },
  { value: "ABSENT_UNEXCUSED", label: "Absent non excusé" },
];

type ChildRow = Awaited<
  ReturnType<typeof getClassRoomAttendance>
>["children"][number];

interface EditableRecord {
  childId: number;
  status: string;
  arrivalTime: string;
  departureTime: string;
}

function toTimeValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function ClassAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      }
    >
      <ClassAttendance />
    </Suspense>
  );
}

function ClassAttendance() {
  const params = useParams<{ id: string }>();
  const classRoomId = parseInt(params.id);
  const today = dayKeyTunis(todayTunis());
  const [date, setDate] = useState(today);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getClassRoomAttendance>
  > | null>(null);
  const [records, setRecords] = useState<EditableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reason, setReason] = useState("");

  const load = (selectedDate: string) => {
    getClassRoomAttendance(classRoomId, selectedDate)
      .then((result) => {
        setData(result);
        setRecords(
          result.children.map((child: ChildRow) => {
            const existing = child.attendance?.status;
            const writable =
              existing &&
              ["PRESENT", "LATE", "ABSENT_EXCUSED", "ABSENT_UNEXCUSED"].includes(
                existing
              );
            return {
              childId: child.id,
              // ABSENT_DECLARED (pending declaration) stays "" until educator decides
              status: writable ? existing : "",
              arrivalTime: toTimeValue(child.attendance?.arrivalTime),
              departureTime: toTimeValue(child.attendance?.departureTime),
            };
          })
        );
      })
      .catch(() => {
        setError("Erreur lors du chargement des données");
        setData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classRoomId]);

  const updateRecord = (childId: number, field: keyof EditableRecord, value: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.childId === childId ? { ...r, [field]: value } : r))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await saveClassRoomAttendance(
        classRoomId,
        date,
        records.map((r) => ({ ...r, reason }))
      );
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess("Présences enregistrées");
        setLoading(true);
        load(date);
      }
    } catch {
      setError("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setLoading(true);
                    setError("");
                    load(e.target.value);
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving || loading || !data || data.children.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Enregistrement..." : "Enregistrer les présences"}
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Motif de correction (requis uniquement si vous modifiez des
                présences déjà enregistrées)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: erreur de saisie, enfant reparti plus tôt..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg mb-4">
                {success}
              </div>
            )}

            {loading ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                Chargement...
              </p>
            ) : !data ? null : data.children.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                Aucun enfant dans cette classe
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Enfant
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
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.children.map((child) => {
                      const record = records.find((r) => r.childId === child.id);
                      return (
                        <tr key={child.id}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {child.firstName} {child.lastName}
                            </div>
                            {(() => {
                              const day = child.attendance?.declarationDays?.[0];
                              if (!day) return null;
                              if (day.status === "PENDING") {
                                return (
                                  <span className="text-xs text-amber-600 dark:text-amber-400">
                                    Absence déclarée — à vérifier
                                  </span>
                                );
                              }
                              if (day.status === "CONFIRMED") {
                                return (
                                  <span className="text-xs text-red-600 dark:text-red-400">
                                    Absence confirmée
                                    {day.verifier ? ` par ${day.verifier.name}` : ""}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={record?.status ?? ""}
                              onChange={(e) =>
                                updateRecord(child.id, "status", e.target.value)
                              }
                              disabled={saving}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="time"
                              value={record?.arrivalTime ?? ""}
                              onChange={(e) =>
                                updateRecord(child.id, "arrivalTime", e.target.value)
                              }
                              disabled={saving}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="time"
                              value={record?.departureTime ?? ""}
                              onChange={(e) =>
                                updateRecord(child.id, "departureTime", e.target.value)
                              }
                              disabled={saving}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            />
                          </td>
                        </tr>
                      );
                    })}
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
