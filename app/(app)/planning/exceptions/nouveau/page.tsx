"use client";

import {
  createScheduleException,
  getClassRoomsForExceptions,
  getTimetableSlotOptions,
} from "@/app/actions/exceptions";
import { getActivityOptions } from "@/app/actions/planning";
import { WEEKDAYS, WEEKDAY_LABELS, SLOT_KINDS, SLOT_KIND_LABELS } from "@/lib/schedule-constants";
import { minutesToHHMM, hhmmToMinutes } from "@/lib/tunis-time";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition, useEffect, Suspense } from "react";

type SlotOption = {
  id: number;
  weekday: string;
  kind: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
  activityId: number | null;
  notes: string | null;
  timetable: { id: number; label: string };
  activity: { id: number; title: string } | null;
};

type ItemDraft = {
  action: "MODIFY_SLOT" | "REMOVE_SLOT" | "ADD_SLOT";
  sourceSlotId: number | "";
  weekday: string;
  kind: string;
  title: string;
  start: string;
  end: string;
  activityId: string;
  notes: string;
};

const emptyItem = (weekday = "MONDAY"): ItemDraft => ({
  action: "MODIFY_SLOT",
  sourceSlotId: "",
  weekday,
  kind: "ACTIVITY",
  title: "",
  start: "",
  end: "",
  activityId: "",
  notes: "",
});

export default function NewExceptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      }
    >
      <NewExceptionForm />
    </Suspense>
  );
}

function NewExceptionForm() {
  const router = useRouter();
  const [classRooms, setClassRooms] = useState<{ id: number; name: string }[]>([]);
  const [slotOptions, setSlotOptions] = useState<SlotOption[]>([]);
  const [activities, setActivities] = useState<{ id: number; title: string }[]>([]);
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    Promise.all([
      getClassRoomsForExceptions(),
      getTimetableSlotOptions(),
      getActivityOptions(),
    ]).then(([cr, slots, acts]) => {
      setClassRooms(cr);
      setSlotOptions(slots as SlotOption[]);
      setActivities(acts);
    });
  }, []);

  const updateItem = (index: number, patch: Partial<ItemDraft>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const onSelectSourceSlot = (index: number, slotId: number | "") => {
    const slot = slotOptions.find((s) => s.id === slotId);
    updateItem(index, {
      sourceSlotId: slotId,
      ...(slot
        ? {
            weekday: slot.weekday,
            kind: slot.kind,
            title: slot.title,
            start: minutesToHHMM(slot.startMinutes),
            end: minutesToHHMM(slot.endMinutes),
            activityId: slot.activityId ? String(slot.activityId) : "",
            notes: slot.notes ?? "",
          }
        : {}),
    });
  };

  const handleSubmit = async (formData: FormData) => {
    setError("");
    const payloadItems = items.map((it) => {
      const startMinutes = hhmmToMinutes(it.start);
      const endMinutes = hhmmToMinutes(it.end);
      return {
        action: it.action,
        sourceSlotId: it.sourceSlotId === "" ? null : Number(it.sourceSlotId),
        weekday: it.weekday,
        kind: it.kind,
        title: it.title,
        startMinutes,
        endMinutes,
        activityId: it.activityId === "" ? null : Number(it.activityId),
        notes: it.notes || null,
      };
    });

    startTransition(async () => {
      const result = await createScheduleException({
        classRoomId: parseInt(formData.get("classRoomId") as string),
        validFrom: (formData.get("validFrom") as string) || "",
        validTo: (formData.get("validTo") as string) || "",
        reason: (formData.get("reason") as string) || "",
        items: payloadItems,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/planning/exceptions");
      }
    });
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white disabled:opacity-50";
  const labelClass = "block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Nouvelle exception par classe
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form action={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Classe *</label>
                  <select name="classRoomId" required className={inputClass} disabled={isPending}>
                    <option value="">— Choisir —</option>
                    {classRooms.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Du *</label>
                  <input name="validFrom" type="date" required className={inputClass} disabled={isPending} />
                </div>
                <div>
                  <label className={labelClass}>Au *</label>
                  <input name="validTo" type="date" required className={inputClass} disabled={isPending} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Motif (optionnel)</label>
                <input name="reason" type="text" className={inputClass} disabled={isPending} placeholder="Ex: Atelier danse le mercredi" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Modifications ({items.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setItems((p) => [...p, emptyItem()])}
                    className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                  >
                    + Ajouter une modification
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex flex-wrap gap-3 mb-3">
                        <div className="w-48">
                          <label className={labelClass}>Action</label>
                          <select
                            value={item.action}
                            onChange={(e) =>
                              updateItem(index, { action: e.target.value as ItemDraft["action"] })
                            }
                            className={inputClass}
                            disabled={isPending}
                          >
                            <option value="MODIFY_SLOT">Modifier un créneau global</option>
                            <option value="REMOVE_SLOT">Retirer un créneau global</option>
                            <option value="ADD_SLOT">Ajouter un créneau</option>
                          </select>
                        </div>
                        {item.action !== "ADD_SLOT" ? (
                          <div className="flex-1 min-w-64">
                            <label className={labelClass}>Créneau global *</label>
                            <select
                              value={item.sourceSlotId}
                              onChange={(e) =>
                                onSelectSourceSlot(index, e.target.value === "" ? "" : Number(e.target.value))
                              }
                              className={inputClass}
                              disabled={isPending}
                            >
                              <option value="">— Choisir —</option>
                              {slotOptions.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.timetable.label} — {WEEKDAY_LABELS[s.weekday as keyof typeof WEEKDAY_LABELS]} {minutesToHHMM(s.startMinutes)} {s.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="w-40">
                            <label className={labelClass}>Jour *</label>
                            <select
                              value={item.weekday}
                              onChange={(e) => updateItem(index, { weekday: e.target.value })}
                              className={inputClass}
                              disabled={isPending}
                            >
                              {WEEKDAYS.map((w) => (
                                <option key={w} value={w}>{WEEKDAY_LABELS[w]}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {items.length > 1 && (
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => setItems((p) => p.filter((_, i) => i !== index))}
                              className="text-sm text-red-600 hover:text-red-700"
                            >
                              Retirer
                            </button>
                          </div>
                        )}
                      </div>

                      {item.action === "MODIFY_SLOT" && item.sourceSlotId !== "" && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className={labelClass}>Type</label>
                            <select value={item.kind} onChange={(e) => updateItem(index, { kind: e.target.value })} className={inputClass} disabled={isPending}>
                              {SLOT_KINDS.map((k) => <option key={k} value={k}>{SLOT_KIND_LABELS[k]}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>Titre *</label>
                            <input type="text" value={item.title} onChange={(e) => updateItem(index, { title: e.target.value })} className={inputClass} disabled={isPending} />
                          </div>
                          <div>
                            <label className={labelClass}>Début</label>
                            <input type="time" value={item.start} onChange={(e) => updateItem(index, { start: e.target.value })} className={inputClass} disabled={isPending} />
                          </div>
                          <div>
                            <label className={labelClass}>Fin</label>
                            <input type="time" value={item.end} onChange={(e) => updateItem(index, { end: e.target.value })} className={inputClass} disabled={isPending} />
                          </div>
                          <div>
                            <label className={labelClass}>Activité</label>
                            <select value={item.activityId} onChange={(e) => updateItem(index, { activityId: e.target.value })} className={inputClass} disabled={isPending}>
                              <option value="">— Aucune —</option>
                              {activities.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2 md:col-span-3">
                            <label className={labelClass}>Notes</label>
                            <input type="text" value={item.notes} onChange={(e) => updateItem(index, { notes: e.target.value })} className={inputClass} disabled={isPending} />
                          </div>
                        </div>
                      )}

                      {item.action === "ADD_SLOT" && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className={labelClass}>Type</label>
                            <select value={item.kind} onChange={(e) => updateItem(index, { kind: e.target.value })} className={inputClass} disabled={isPending}>
                              {SLOT_KINDS.map((k) => <option key={k} value={k}>{SLOT_KIND_LABELS[k]}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>Titre *</label>
                            <input type="text" value={item.title} onChange={(e) => updateItem(index, { title: e.target.value })} className={inputClass} disabled={isPending} />
                          </div>
                          <div>
                            <label className={labelClass}>Début *</label>
                            <input type="time" value={item.start} onChange={(e) => updateItem(index, { start: e.target.value })} className={inputClass} disabled={isPending} />
                          </div>
                          <div>
                            <label className={labelClass}>Fin *</label>
                            <input type="time" value={item.end} onChange={(e) => updateItem(index, { end: e.target.value })} className={inputClass} disabled={isPending} />
                          </div>
                          <div>
                            <label className={labelClass}>Activité</label>
                            <select value={item.activityId} onChange={(e) => updateItem(index, { activityId: e.target.value })} className={inputClass} disabled={isPending}>
                              <option value="">— Aucune —</option>
                              {activities.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2 md:col-span-3">
                            <label className={labelClass}>Notes</label>
                            <input type="text" value={item.notes} onChange={(e) => updateItem(index, { notes: e.target.value })} className={inputClass} disabled={isPending} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Link
                  href="/planning/exceptions"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Enregistrement..." : "Créer l'exception"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
