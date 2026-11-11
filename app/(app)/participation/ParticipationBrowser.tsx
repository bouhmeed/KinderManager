"use client";

import { useState, useEffect, Suspense } from "react";
import { getOccurrences } from "@/app/actions/activities";
import {
  getOccurrenceParticipations,
  correctParticipation,
} from "@/app/actions/participation";
import { PARTICIPATION_STATUS_LABELS } from "@/lib/schedule-constants";
import { minutesToHHMM } from "@/lib/tunis-time";
import { dayKeyTunis, todayTunis } from "@/lib/dates";
import Link from "next/link";
import type { ParticipationStatus } from "@/generated/prisma/client";

type Occ = Awaited<ReturnType<typeof getOccurrences>>[number];
type PartRow = {
  id: number; status: ParticipationStatus; manualStatus: ParticipationStatus | null;
  autoStatus: ParticipationStatus | null; autoMinutes: number | null; manualMinutes: number | null;
  overrideReason: string | null; child: { id: number; firstName: string; lastName: string };
};

const COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800", PRESENT: "bg-green-100 text-green-800",
  PARTIAL: "bg-blue-100 text-blue-800", ABSENT: "bg-red-100 text-red-700", CANCELLED: "bg-gray-200 text-gray-600",
};

export default function ParticipationBrowser({ classRooms }: { classRooms: { id: number; name: string }[] }) {
  return <Suspense fallback={<p className="text-gray-500 py-12 text-center">Chargement…</p>}><Inner classRooms={classRooms} /></Suspense>;
}

function Inner({ classRooms }: { classRooms: { id: number; name: string }[] }) {
  const [classRoomId, setClassRoomId] = useState(classRooms[0] ? String(classRooms[0].id) : "");
  const [date, setDate] = useState(dayKeyTunis(todayTunis()));
  const [occs, setOccs] = useState<Occ[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [parts, setParts] = useState<Record<number, PartRow[]>>({});
  const [correcting, setCorrecting] = useState<PartRow | null>(null);
  const [correctForm, setCorrectForm] = useState({ status: "PRESENT", minutes: "", reason: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getOccurrences({ classRoomId: classRoomId ? parseInt(classRoomId) : undefined, date })
      .then((r) => { if (alive) setOccs(r.filter((o) => o.tracksParticipation)); })
      .catch(() => { if (alive) setOccs([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [classRoomId, date]);

  const toggle = async (o: Occ) => {
    if (openId === o.id) { setOpenId(null); return; }
    setOpenId(o.id);
    if (!parts[o.id]) {
      const res = await getOccurrenceParticipations(o.id);
      if (res) setParts((p) => ({ ...p, [o.id]: res.participations as PartRow[] }));
    }
  };

  const doCorrect = async () => {
    if (!correcting) return;
    setBusy(true);
    const res = await correctParticipation(correcting.id, {
      status: correctForm.status,
      minutes: correctForm.minutes === "" ? null : parseInt(correctForm.minutes),
      reason: correctForm.reason,
    });
    setBusy(false);
    if (res?.error) { window.alert(res.error); return; }
    setCorrecting(null);
    if (openId != null) {
      const r = await getOccurrenceParticipations(openId);
      if (r) setParts((p) => ({ ...p, [openId]: r.participations as PartRow[] }));
    }
  };

  const input = "px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Participations du jour</h2>
        <div className="flex items-center gap-3">
          <select value={classRoomId} onChange={(e) => { setLoading(true); setClassRoomId(e.target.value); }} className={input}>
            {classRooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => { setLoading(true); setDate(e.target.value); }} className={input} />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">Chargement…</p>
      ) : occs.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">Aucune séance suivie pour cette date.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {occs.map((o) => (
            <li key={o.id}>
              <button onClick={() => toggle(o)} className="w-full flex flex-wrap items-center gap-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 px-2 rounded">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 w-36">{minutesToHHMM(o.startMinutes)} – {minutesToHHMM(o.endMinutes)}</span>
                <span className="text-sm text-gray-900 dark:text-white flex-1">{o.title}</span>
                <span className="text-xs text-gray-500">{o.classRoom.name}</span>
                {o.status === "CANCELLED" && <span className="text-xs text-red-600 font-semibold">Annulée</span>}
              </button>
              {openId === o.id && (
                <div className="pb-4 px-2">
                  {!parts[o.id] ? (
                    <p className="text-sm text-gray-500 py-2">Chargement…</p>
                  ) : parts[o.id].length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">Aucun enfant.</p>
                  ) : (
                    <table className="min-w-full text-sm mt-2">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase">
                          <th className="py-1 pr-4">Enfant</th><th className="py-1 pr-4">Statut</th>
                          <th className="py-1 pr-4">Auto</th><th className="py-1 pr-4">Minutes</th><th className="py-1"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {parts[o.id].map((p) => (
                          <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700">
                            <td className="py-1.5 pr-4 text-gray-800 dark:text-gray-200">{p.child.firstName} {p.child.lastName}</td>
                            <td className="py-1.5 pr-4">
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${COLORS[p.status]}`}>{PARTICIPATION_STATUS_LABELS[p.status]}</span>
                              {p.manualStatus && <span className="ml-1 text-xs text-amber-600">corrigé</span>}
                            </td>
                            <td className="py-1.5 pr-4 text-xs text-gray-500">{p.autoStatus ? PARTICIPATION_STATUS_LABELS[p.autoStatus] : "—"}</td>
                            <td className="py-1.5 pr-4 text-gray-600 dark:text-gray-300">{p.manualMinutes ?? p.autoMinutes ?? "—"}</td>
                            <td className="py-1.5 text-right">
                              <button onClick={() => { setCorrecting(p); setCorrectForm({ status: p.manualStatus ?? p.status, minutes: String(p.manualMinutes ?? p.autoMinutes ?? ""), reason: "" }); }} className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">Corriger</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <Link href={`/seances/${o.id}`} className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 mt-2 inline-block">Ouvrir la séance →</Link>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {correcting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Corriger — {correcting.child.firstName} {correcting.child.lastName}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Statut</label>
                  <select value={correctForm.status} onChange={(e) => setCorrectForm({ ...correctForm, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white">
                    {(["PENDING", "PRESENT", "PARTIAL", "ABSENT", "CANCELLED"] as ParticipationStatus[]).map((s) => (
                      <option key={s} value={s}>{PARTICIPATION_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Minutes</label>
                  <input type="number" min={0} max={1440} value={correctForm.minutes} onChange={(e) => setCorrectForm({ ...correctForm, minutes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Motif (obligatoire)</label>
                <textarea rows={2} value={correctForm.reason} onChange={(e) => setCorrectForm({ ...correctForm, reason: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
              </div>
              <div className="flex justify-end space-x-3">
                <button onClick={() => setCorrecting(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Annuler</button>
                <button onClick={doCorrect} disabled={busy || !correctForm.reason.trim()} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
                  {busy ? "Enregistrement…" : "Confirmer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
