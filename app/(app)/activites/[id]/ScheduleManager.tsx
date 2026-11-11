"use client";

import {
  createActivitySchedule,
  updateActivitySchedule,
  deleteActivitySchedule,
  getClassRoomOptions,
  getEducatorOptions,
} from "@/app/actions/activities";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/lib/schedule-constants";
import { minutesToHHMM } from "@/lib/tunis-time";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";

type ScheduleRow = {
  id: number;
  classRoomId: number | null;
  classRoomName: string | null;
  weekday: string | null;
  startMinutes: number;
  endMinutes: number;
  validFrom: string;
  validTo: string | null;
  educatorId: number | null;
  educatorName: string | null;
  isCancelled: boolean;
};

interface FormState {
  scheduleId: number | null;
  scope: string; // "all" | classRoomId
  weekday: string; // "" = ponctuelle
  start: string;
  end: string;
  validFrom: string;
  validTo: string;
  educatorId: string;
}

const EMPTY: FormState = {
  scheduleId: null,
  scope: "all",
  weekday: "MONDAY",
  start: "",
  end: "",
  validFrom: "",
  validTo: "",
  educatorId: "",
};

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

export default function ScheduleManager({
  activityId,
  schedules,
  isAdmin,
}: {
  activityId: number;
  schedules: ScheduleRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [classRooms, setClassRooms] = useState<{ id: number; name: string }[]>([]);
  const [educators, setEducators] = useState<{ id: number; user: { name: string } }[]>([]);

  useEffect(() => {
    if (isAdmin) {
      Promise.all([getClassRoomOptions(), getEducatorOptions()]).then(
        ([cr, ed]) => {
          setClassRooms(cr);
          setEducators(ed);
        }
      );
    }
  }, [isAdmin]);

  const openAdd = () => setForm({ ...EMPTY });
  const openEdit = (s: ScheduleRow) =>
    setForm({
      scheduleId: s.id,
      scope: s.classRoomId ? String(s.classRoomId) : "all",
      weekday: s.weekday ?? "",
      start: minutesToHHMM(s.startMinutes),
      end: minutesToHHMM(s.endMinutes),
      validFrom: toDateInput(s.validFrom),
      validTo: s.validTo ? toDateInput(s.validTo) : "",
      educatorId: s.educatorId ? String(s.educatorId) : "",
    });

  const handleSubmit = () => {
    if (!form) return;
    setError("");
    startTransition(async () => {
      const input = {
        activityId,
        classRoomId: form.scope === "all" ? null : parseInt(form.scope),
        weekday: form.weekday === "" ? null : form.weekday,
        start: form.start,
        end: form.end,
        validFrom: form.validFrom,
        validTo: form.weekday === "" ? null : form.validTo || null,
        educatorId: form.educatorId === "" ? null : parseInt(form.educatorId),
      };
      const result = form.scheduleId
        ? await updateActivitySchedule(form.scheduleId, input)
        : await createActivitySchedule(input);
      if (result?.error) {
        setError(result.error);
      } else {
        setForm(null);
        router.refresh();
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("Supprimer cette planification ? Les séances futures seront annulées.")) return;
    startTransition(async () => {
      const result = await deleteActivitySchedule(id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white disabled:opacity-50";
  const labelClass = "block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Planifications ({schedules.length})
        </h3>
        {isAdmin && !form && (
          <button
            onClick={openAdd}
            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg"
          >
            + Planifier
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {form && isAdmin && (
        <div className="mb-4 p-4 border border-indigo-200 dark:border-indigo-800 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className={labelClass}>Portée</label>
              <select
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
                className={inputClass}
                disabled={isPending}
              >
                <option value="all">Toutes les classes</option>
                {classRooms.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Récurrence</label>
              <select
                value={form.weekday}
                onChange={(e) => setForm({ ...form, weekday: e.target.value })}
                className={inputClass}
                disabled={isPending}
              >
                <option value="">Ponctuelle (une date)</option>
                {WEEKDAYS.map((w) => (
                  <option key={w} value={w}>{WEEKDAY_LABELS[w]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Début</label>
              <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={inputClass} disabled={isPending} />
            </div>
            <div>
              <label className={labelClass}>Fin</label>
              <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={inputClass} disabled={isPending} />
            </div>
            <div>
              <label className={labelClass}>À partir du</label>
              <input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className={inputClass} disabled={isPending} />
            </div>
            <div>
              <label className={labelClass}>
                {form.weekday === "" ? "Date (ponctuelle)" : "Jusqu'au (optionnel)"}
              </label>
              {form.weekday === "" ? (
                <input type="date" value={form.validFrom} disabled className={inputClass} />
              ) : (
                <input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} className={inputClass} disabled={isPending} />
              )}
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Éducateur responsable (optionnel)</label>
              <select value={form.educatorId} onChange={(e) => setForm({ ...form, educatorId: e.target.value })} className={inputClass} disabled={isPending}>
                <option value="">— Aucun —</option>
                {educators.map((ed) => (
                  <option key={ed.id} value={ed.id}>{ed.user.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button onClick={() => { setForm(null); setError(""); }} disabled={isPending} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || !form.start || !form.end || !form.validFrom}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
            >
              {isPending ? "Enregistrement..." : form.scheduleId ? "Enregistrer" : "Planifier"}
            </button>
          </div>
        </div>
      )}

      {schedules.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Aucune planification.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {schedules.map((s) => (
            <li key={s.id} className="py-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300 w-32">
                {minutesToHHMM(s.startMinutes)} – {minutesToHHMM(s.endMinutes)}
              </span>
              <span className="text-gray-600 dark:text-gray-300">
                {s.weekday ? `Chaque ${WEEKDAY_LABELS[s.weekday as keyof typeof WEEKDAY_LABELS]}` : "Ponctuelle"}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {s.classRoomName ?? "Toutes les classes"} — du {s.validFrom.slice(0, 10)}
                {s.validTo ? ` au ${s.validTo.slice(0, 10)}` : ""}
                {s.educatorName ? ` — ${s.educatorName}` : ""}
              </span>
              {s.isCancelled && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">Annulée</span>
              )}
              {isAdmin && (
                <span className="ml-auto flex space-x-3">
                  <button onClick={() => openEdit(s)} className="text-indigo-600 hover:text-indigo-800 text-xs">Modifier</button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-700 text-xs">Supprimer</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
