"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideEnrollment } from "@/app/actions/clubs";

type Pending = {
  id: number;
  createdAt: Date;
  child: { id: number; firstName: string; lastName: string; classRoom: { name: string } | null };
  activity: { id: number; title: string; color: string | null };
  requester: { name: string } | null;
};

export default function ClubsManager({ pending }: { pending: Pending[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<number, string>>({});

  const decide = (id: number, approve: boolean) => {
    startTransition(async () => {
      await decideEnrollment(id, approve, notes[id] || undefined);
      router.refresh();
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Demandes d&apos;inscription aux clubs ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">Aucune demande en attente.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {pending.map((e) => (
            <li key={e.id} className="py-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-48">
                <p className="font-medium text-gray-900 dark:text-white">
                  {e.child.firstName} {e.child.lastName}
                  <span className="text-sm font-normal text-gray-500"> — {e.child.classRoom?.name ?? "Sans classe"}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Club « {e.activity.title} » — demandé par {e.requester?.name ?? "admin"} le {new Date(e.createdAt).toLocaleDateString("fr-FR")}
                </p>
                <input
                  value={notes[e.id] ?? ""}
                  onChange={(ev) => setNotes({ ...notes, [e.id]: ev.target.value })}
                  placeholder="Note / motif (optionnel)"
                  className="mt-2 w-full max-w-sm px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => decide(e.id, true)}
                  disabled={isPending}
                  className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                >
                  Approuver
                </button>
                <button
                  onClick={() => decide(e.id, false)}
                  disabled={isPending}
                  className="px-4 py-2 text-sm bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg disabled:opacity-50"
                >
                  Refuser
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
