"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getChildEnrollments, requestEnrollment, cancelEnrollmentRequest } from "@/app/actions/clubs";
import { ENROLLMENT_STATUS_LABELS } from "@/lib/schedule-constants";
import type { ClubEnrollmentStatus } from "@/generated/prisma/client";

type ChildOpt = { id: number; firstName: string; lastName: string };
type Enrollment = {
  id: number;
  status: ClubEnrollmentStatus;
  childId: number;
  decisionNote: string | null;
};

const COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-200 text-gray-600",
};

export default function ClubRequestPanel({
  activityId,
  childOptions,
}: {
  activityId: number;
  childOptions: ChildOpt[];
}) {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Record<number, Enrollment | null>>({});
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  useEffect(() => {
    childOptions.forEach((c) => {
      getChildEnrollments(c.id).then((list) => {
        const e = list.find((x) => x.activityId === activityId) ?? null;
        setEnrollments((prev) => ({ ...prev, [c.id]: e }));
      });
    });
  }, [activityId, childOptions]);

  const request = () => {
    if (!selected) return;
    setMsg("");
    startTransition(async () => {
      const res = await requestEnrollment(parseInt(selected), activityId);
      if (res?.error) setMsg(res.error);
      else {
        setMsg("Demande envoyée — en attente de décision.");
        router.refresh();
        getChildEnrollments(parseInt(selected)).then((list) => {
          const e = list.find((x) => x.activityId === activityId) ?? null;
          setEnrollments((prev) => ({ ...prev, [parseInt(selected)]: e }));
        });
      }
    });
  };

  const cancel = (id: number, childId: number) => {
    startTransition(async () => {
      await cancelEnrollmentRequest(id);
      setEnrollments((prev) => ({ ...prev, [childId]: null }));
      router.refresh();
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Inscription au club</h3>
      <div className="space-y-3">
        {childOptions.map((c) => {
          const e = enrollments[c.id];
          return (
            <div key={c.id} className="flex flex-wrap items-center gap-3 text-sm border border-gray-100 dark:border-gray-700 rounded-lg px-4 py-3">
              <span className="font-medium text-gray-900 dark:text-white flex-1">
                {c.firstName} {c.lastName}
              </span>
              {e ? (
                <>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${COLORS[e.status]}`}>
                    {ENROLLMENT_STATUS_LABELS[e.status]}
                  </span>
                  {e.status === "REJECTED" && e.decisionNote && (
                    <span className="text-xs text-gray-500">Motif : {e.decisionNote}</span>
                  )}
                  {e.status === "PENDING" && (
                    <button onClick={() => cancel(e.id, c.id)} disabled={isPending} className="text-xs text-red-600 hover:text-red-800">
                      Annuler la demande
                    </button>
                  )}
                </>
              ) : (
                <span className="text-xs text-gray-400">Non inscrit</span>
              )}
            </div>
          );
        })}
        <div className="flex items-center gap-3 pt-2">
          <select value={selected} onChange={(ev) => setSelected(ev.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white">
            <option value="">Choisir un enfant…</option>
            {childOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
          <button onClick={request} disabled={isPending || !selected} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
            {isPending ? "Envoi..." : "Demander l'inscription"}
          </button>
        </div>
        {msg && <p className="text-sm text-green-700 dark:text-green-400">{msg}</p>}
      </div>
    </div>
  );
}
