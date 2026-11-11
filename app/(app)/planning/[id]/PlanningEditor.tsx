"use client";

import {
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
  reorderTimetableSlots,
} from "@/app/actions/planning";
import { WEEKDAYS, WEEKDAY_LABELS, SLOT_KINDS, SLOT_KIND_LABELS } from "@/lib/schedule-constants";
import { minutesToHHMM, hhmmToMinutes } from "@/lib/tunis-time";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Slot = {
  id: number;
  weekday: string;
  position: number;
  kind: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
  activityId: number | null;
  notes: string | null;
  activity: { id: number; title: string } | null;
};

type ActivityOption = { id: number; title: string; category: string };

const KIND_COLORS: Record<string, string> = {
  ACTIVITY: "bg-indigo-100 text-indigo-800",
  MEAL: "bg-amber-100 text-amber-800",
  NAP: "bg-purple-100 text-purple-800",
  BREAK: "bg-green-100 text-green-800",
  ARRIVAL: "bg-sky-100 text-sky-800",
  DEPARTURE: "bg-sky-100 text-sky-800",
  OTHER: "bg-gray-100 text-gray-600",
};

interface FormState {
  slotId: number | null;
  weekday: string;
  kind: string;
  title: string;
  start: string;
  end: string;
  activityId: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  slotId: null,
  weekday: "MONDAY",
  kind: "ACTIVITY",
  title: "",
  start: "",
  end: "",
  activityId: "",
  notes: "",
};

export default function PlanningEditor({
  timetableId,
  slots,
  activities,
}: {
  timetableId: number;
  slots: Slot[];
  activities: ActivityOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const openAddForm = (weekday: string) =>
    setForm({ ...EMPTY_FORM, weekday });

  const openEditForm = (slot: Slot) =>
    setForm({
      slotId: slot.id,
      weekday: slot.weekday,
      kind: slot.kind,
      title: slot.title,
      start: minutesToHHMM(slot.startMinutes),
      end: minutesToHHMM(slot.endMinutes),
      activityId: slot.activityId ? String(slot.activityId) : "",
      notes: slot.notes ?? "",
    });

  const handleSubmit = () => {
    if (!form) return;
    setError("");
    const startMinutes = hhmmToMinutes(form.start);
    const endMinutes = hhmmToMinutes(form.end);
    if (startMinutes === null || endMinutes === null) {
      setError("Les heures de début et de fin sont invalides");
      return;
    }
    startTransition(async () => {
      const input = {
        weekday: form.weekday,
        kind: form.kind,
        title: form.title,
        startMinutes,
        endMinutes,
        activityId: form.activityId ? parseInt(form.activityId) : null,
        notes: form.notes || null,
      };
      const result = form.slotId
        ? await updateTimetableSlot(form.slotId, input)
        : await createTimetableSlot(timetableId, input);
      if (result?.error) {
        setError(result.error);
      } else {
        setForm(null);
        router.refresh();
      }
    });
  };

  const handleDelete = (slotId: number) => {
    if (!window.confirm("Supprimer ce créneau ?")) return;
    startTransition(async () => {
      const result = await deleteTimetableSlot(slotId);
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleMove = (weekday: string, daySlots: Slot[], index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= daySlots.length) return;
    const ids = daySlots.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    startTransition(async () => {
      const result = await reorderTimetableSlots(timetableId, weekday, ids);
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white disabled:opacity-50";
  const labelClass =
    "block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1";

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {WEEKDAYS.map((weekday) => {
        const daySlots = slots.filter((s) => s.weekday === weekday);
        const isFormOpen = form?.weekday === weekday;
        return (
          <div
            key={weekday}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {WEEKDAY_LABELS[weekday]}
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  {daySlots.length} créneau{daySlots.length > 1 ? "x" : ""}
                </span>
              </h3>
              {!isFormOpen && (
                <button
                  onClick={() => openAddForm(weekday)}
                  className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Ajouter un créneau
                </button>
              )}
            </div>

            {isFormOpen && form && (
              <div className="mb-4 p-4 border border-indigo-200 dark:border-indigo-800 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className={labelClass}>Type</label>
                    <select
                      value={form.kind}
                      onChange={(e) => setForm({ ...form, kind: e.target.value })}
                      className={inputClass}
                      disabled={isPending}
                    >
                      {SLOT_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {SLOT_KIND_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Titre *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className={inputClass}
                      disabled={isPending}
                      placeholder="Ex: Goûter, Peinture..."
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Début</label>
                    <input
                      type="time"
                      value={form.start}
                      onChange={(e) => setForm({ ...form, start: e.target.value })}
                      className={inputClass}
                      disabled={isPending}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fin</label>
                    <input
                      type="time"
                      value={form.end}
                      onChange={(e) => setForm({ ...form, end: e.target.value })}
                      className={inputClass}
                      disabled={isPending}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelClass}>
                      Activité associée (optionnel)
                    </label>
                    <select
                      value={form.activityId}
                      onChange={(e) =>
                        setForm({ ...form, activityId: e.target.value })
                      }
                      className={inputClass}
                      disabled={isPending}
                    >
                      <option value="">— Aucune —</option>
                      {activities.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Notes (optionnel)</label>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className={inputClass}
                      disabled={isPending}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setForm(null);
                      setError("");
                    }}
                    disabled={isPending}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isPending || !form.title || !form.start || !form.end}
                    className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending
                      ? "Enregistrement..."
                      : form.slotId
                        ? "Enregistrer"
                        : "Ajouter"}
                  </button>
                </div>
              </div>
            )}

            {daySlots.length === 0 && !isFormOpen ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                Aucun créneau ce jour-là.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {daySlots.map((slot, index) => (
                  <li
                    key={slot.id}
                    className="py-3 flex flex-wrap items-center gap-3"
                  >
                    <div className="flex flex-col items-center space-y-0.5">
                      <button
                        onClick={() => handleMove(weekday, daySlots, index, -1)}
                        disabled={isPending || index === 0}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                        aria-label="Monter"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMove(weekday, daySlots, index, 1)}
                        disabled={isPending || index === daySlots.length - 1}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                        aria-label="Descendre"
                      >
                        ▼
                      </button>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-28">
                      {minutesToHHMM(slot.startMinutes)} –{" "}
                      {minutesToHHMM(slot.endMinutes)}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full ${KIND_COLORS[slot.kind] ?? KIND_COLORS.OTHER}`}
                    >
                      {SLOT_KIND_LABELS[slot.kind as keyof typeof SLOT_KIND_LABELS] ?? slot.kind}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {slot.title}
                        {slot.activity && (
                          <span className="ml-2 text-xs font-normal text-indigo-600 dark:text-indigo-400">
                            ({slot.activity.title})
                          </span>
                        )}
                      </p>
                      {slot.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {slot.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <button
                        onClick={() => openEditForm(slot)}
                        disabled={isPending}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(slot.id)}
                        disabled={isPending}
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        Supprimer
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
