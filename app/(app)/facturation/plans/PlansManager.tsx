"use client";

import {
  createPlan,
  deletePlan,
  getPlans,
} from "@/app/actions/billing";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Plan = Awaited<ReturnType<typeof getPlans>>[number];

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white";
const labelCls =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export default function PlansManager({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = e.currentTarget;
    const result = await createPlan(new FormData(form));
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      form.reset();
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Nouveau plan
        </h2>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Nom *</label>
            <input name="name" required placeholder="Ex: Temps plein" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Début *</label>
            <input name="startTime" required placeholder="08:00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Fin *</label>
            <input name="endTime" required placeholder="17:00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Prix * (€)</label>
            <input name="price" type="number" step="0.01" min="0" required className={inputCls} />
          </div>
          <div className="md:col-span-4">
            <button
              type="submit"
              disabled={pending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {pending ? "Création..." : "Créer le plan"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Plans existants
        </h2>
        {plans.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Aucun plan
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Horaires</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Prix</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Abonnements</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {plans.map((plan) => (
                  <tr key={plan.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{plan.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {plan.startTime} → {plan.endTime}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {Number(plan.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {plan._count.children}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={async () => {
                          const result = await deletePlan(plan.id);
                          if (result?.error) {
                            alert(result.error);
                          } else {
                            router.refresh();
                          }
                        }}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
