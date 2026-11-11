"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateOccurrence,
  cancelOccurrence,
} from "@/app/actions/activities";
import {
  getOccurrenceParticipations,
  correctParticipation,
  setParticipationRemark,
} from "@/app/actions/participation";
import { PARTICIPATION_STATUS_LABELS } from "@/lib/schedule-constants";
import { minutesToHHMM } from "@/lib/tunis-time";
import type { ParticipationStatus } from "@/generated/prisma/client";

type Occurrence = {
  id: number;
  date: Date;
  startMinutes: number;
  endMinutes: number;
  title: string;
  kind: string;
  status: string;
  tracksParticipation: boolean;
  educatorNote: string | null;
  noteVisibleToParents: boolean;
  manuallyEdited: boolean;
  classRoomId: number;
  classRoom: { id: number; name: string };
  isPast: boolean;
  activity: { id: number; title: string; category: string; description: string | null } | null;
  educator: { id: number; user: { name: string } } | null;
};

type ParticipationRow = {
  id: number;
  status: ParticipationStatus;
  manualStatus: ParticipationStatus | null;
  autoStatus: ParticipationStatus | null;
  autoMinutes: number | null;
  manualMinutes: number | null;
  overrideReason: string | null;
  educatorRemark: string | null;
  remarkVisibleToParents: boolean;
  child: { id: number; firstName: string; lastName: string };
  confirmer: { name: string } | null;
  history: { id: number; oldStatus: string | null; newStatus: string; oldMinutes: number | null; newMinutes: number | null; reason: string; changedAt: Date; changer: { name: string } }[];
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PRESENT: "bg-green-100 text-green-800",
  PARTIAL: "bg-blue-100 text-blue-800",
  ABSENT: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-200 text-gray-600",
};

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function OccurrenceDetail({ occurrence }: { occurrence: Occurrence }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: occurrence.title,
    start: minutesToHHMM(occurrence.startMinutes),
    end: minutesToHHMM(occurrence.endMinutes),
    educatorNote: occurrence.educatorNote ?? "",
    noteVisibleToParents: occurrence.noteVisibleToParents,
  });
  const [participations, setParticipations] = useState<ParticipationRow[] | null>(null);
  const [correcting, setCorrecting] = useState<ParticipationRow | null>(null);
  const [remarking, setRemarking] = useState<ParticipationRow | null>(null);
  const [remarkForm, setRemarkForm] = useState({ remark: "", visible: false });
  const [correctForm, setCorrectForm] = useState({ status: "PRESENT", minutes: "", reason: "" });

  const loadParticipations = () => {
    getOccurrenceParticipations(occurrence.id).then((res) => {
      if (res) setParticipations(res.participations as ParticipationRow[]);
    });
  };

  const isCancelled = occurrence.status === "CANCELLED";
  const isPast = occurrence.isPast;
  const canManage = !isPast && !isCancelled;

  const handleSave = () => {
    setError("");
    startTransition(async () => {
      const result = await updateOccurrence(occurrence.id, {
        title: editForm.title,
        start: editForm.start,
        end: editForm.end,
        educatorNote: editForm.educatorNote,
        noteVisibleToParents: editForm.noteVisibleToParents,
      });
      if (result?.error) setError(result.error);
      else { setEditing(false); router.refresh(); }
    });
  };

  const handleCancel = () => {
    if (!window.confirm("Annuler cette séance ? Les participations seront marquées annulées.")) return;
    startTransition(async () => {
      const result = await cancelOccurrence(occurrence.id);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  };

  const openCorrect = (p: ParticipationRow) => {
    setCorrecting(p);
    setCorrectForm({
      status: p.manualStatus ?? p.status,
      minutes: String(p.manualMinutes ?? p.autoMinutes ?? ""),
      reason: "",
    });
  };

  const handleCorrect = () => {
    if (!correcting) return;
    setError("");
    startTransition(async () => {
      const result = await correctParticipation(correcting.id, {
        status: correctForm.status,
        minutes: correctForm.minutes === "" ? null : parseInt(correctForm.minutes),
        reason: correctForm.reason,
      });
      if (result?.error) setError(result.error);
      else { setCorrecting(null); loadParticipations(); }
    });
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{occurrence.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">{fmtDate(occurrence.date)}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {minutesToHHMM(occurrence.startMinutes)} – {minutesToHHMM(occurrence.endMinutes)}
              {" — "}{occurrence.classRoom.name}
              {occurrence.educator ? ` — ${occurrence.educator.user.name}` : ""}
              {occurrence.activity ? ` — ${occurrence.activity.title}` : ""}
            </p>
            {isCancelled && (
              <span className="inline-block mt-2 px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-700">Séance annulée</span>
            )}
            {occurrence.manuallyEdited && !isCancelled && (
              <span className="inline-block mt-2 ml-2 px-3 py-1 text-xs rounded-full bg-amber-100 text-amber-800">Modifiée manuellement</span>
            )}
          </div>
          <div className="flex space-x-3">
            {occurrence.tracksParticipation && (
              <button
                onClick={loadParticipations}
                className="px-4 py-2 text-sm border border-indigo-300 text-indigo-700 dark:border-indigo-600 dark:text-indigo-300 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
              >
                {participations ? "Actualiser" : "Voir les participations"}
              </button>
            )}
            {canManage && (
              <>
                <button onClick={() => setEditing(!editing)} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-200">
                  {editing ? "Fermer" : "Modifier"}
                </button>
                <button onClick={handleCancel} disabled={isPending} className="px-4 py-2 text-sm bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                  Annuler la séance
                </button>
              </>
            )}
          </div>
        </div>
        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

        {editing && canManage && (
          <div className="mt-6 p-4 border border-indigo-200 dark:border-indigo-800 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Titre</label>
                <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Début</label>
                <input type="time" value={editForm.start} onChange={(e) => setEditForm({ ...editForm, start: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Fin</label>
                <input type="time" value={editForm.end} onChange={(e) => setEditForm({ ...editForm, end: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
              </div>
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 self-end pb-2">
                <input type="checkbox" checked={editForm.noteVisibleToParents} onChange={(e) => setEditForm({ ...editForm, noteVisibleToParents: e.target.checked })} className="rounded border-gray-300 text-indigo-600" />
                <span>Remarque visible par les parents</span>
              </label>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Remarque de l&apos;éducateur</label>
                <textarea rows={2} value={editForm.educatorNote} onChange={(e) => setEditForm({ ...editForm, educatorNote: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Annuler</button>
              <button onClick={handleSave} disabled={isPending} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">Enregistrer</button>
            </div>
          </div>
        )}
      </div>

      {participations && occurrence.tracksParticipation && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Participations ({participations.length})
          </h3>
          {participations.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucun enfant dans cette classe.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Enfant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Auto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Minutes</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Correction</th>
                    {canManage && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {participations.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {p.child.firstName} {p.child.lastName}
                        {p.educatorRemark && (
                          <p className="text-xs text-gray-500 font-normal">{p.educatorRemark}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[p.status]}`}>
                          {PARTICIPATION_STATUS_LABELS[p.status]}
                        </span>
                        {p.manualStatus && <span className="ml-1 text-xs text-amber-600">(corrigé)</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {p.autoStatus ? PARTICIPATION_STATUS_LABELS[p.autoStatus] : "—"}
                        {p.autoMinutes != null ? ` · ${p.autoMinutes} min` : ""}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {p.manualMinutes ?? p.autoMinutes ?? "—"}
                        {(p.manualMinutes ?? p.autoMinutes) != null ? " min" : ""}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                        {p.overrideReason ?? "—"}
                        {p.history.length > 0 && (
                          <p className="text-gray-400">{p.history.length} correction(s) — dernière par {p.history[0].changer.name}</p>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                          <button
                            onClick={() => {
                              setRemarking(p);
                              setRemarkForm({ remark: p.educatorRemark ?? "", visible: p.remarkVisibleToParents });
                            }}
                            className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            Remarque
                          </button>
                          <button onClick={() => openCorrect(p)} className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
                            Corriger
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {remarking && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Remarque — {remarking.child.firstName} {remarking.child.lastName}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Remarque éducateur</label>
                <textarea rows={3} value={remarkForm.remark} onChange={(e) => setRemarkForm({ ...remarkForm, remark: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
              </div>
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={remarkForm.visible} onChange={(e) => setRemarkForm({ ...remarkForm, visible: e.target.checked })} className="rounded border-gray-300 text-indigo-600" />
                <span>Visible par les parents</span>
              </label>
              <div className="flex justify-end space-x-3">
                <button onClick={() => setRemarking(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Annuler</button>
                <button
                  onClick={() => {
                    startTransition(async () => {
                      await setParticipationRemark(remarking.id, remarkForm.remark, remarkForm.visible);
                      setRemarking(null);
                      loadParticipations();
                    });
                  }}
                  disabled={isPending}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
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
              <p className="text-xs text-gray-500">Le résultat automatique est conservé et l&apos;historique est enregistré.</p>
              <div className="flex justify-end space-x-3">
                <button onClick={() => setCorrecting(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Annuler</button>
                <button onClick={handleCorrect} disabled={isPending || !correctForm.reason.trim()} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
                  {isPending ? "Enregistrement..." : "Confirmer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
