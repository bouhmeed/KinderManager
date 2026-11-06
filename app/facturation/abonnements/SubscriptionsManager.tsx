"use client";

import {
  createSubscription,
  deleteSubscription,
  getSubscriptions,
  getParentSubscriptions,
  getPlans,
} from "@/app/actions/billing";
import { getChildren } from "@/app/actions/children";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Subscriptions = Awaited<ReturnType<typeof getSubscriptions>>;
type Plans = Awaited<ReturnType<typeof getPlans>>;
type Children = Awaited<ReturnType<typeof getChildren>>;

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white";
const labelCls =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export default function SubscriptionsManager({
  subscriptions,
  plans,
  childOptions,
  isAdmin,
}: {
  subscriptions: Subscriptions | Awaited<ReturnType<typeof getParentSubscriptions>>;
  plans: Plans;
  childOptions: Children;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = e.currentTarget;
    const result = await createSubscription(new FormData(form));
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
      {isAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Nouvel abonnement
          </h2>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Enfant *</label>
              <select name="childId" required className={inputCls} defaultValue="">
                <option value="" disabled>Sélectionner...</option>
                {childOptions.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.firstName} {child.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Plan *</label>
              <select name="planId" required className={inputCls} defaultValue="">
                <option value="" disabled>Sélectionner...</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({Number(plan.price).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Prix convenu (€) *</label>
              <input name="agreedPrice" type="number" step="0.01" min="0" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Début *</label>
              <input name="startDate" type="date" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fin (optionnel)</label>
              <input name="endDate" type="date" className={inputCls} />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={pending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {pending ? "Création..." : "Créer l'abonnement"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Abonnements
        </h2>
        {subscriptions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Aucun abonnement
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Enfant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Prix</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Début</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fin</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {sub.child.firstName} {sub.child.lastName}
                      <span className="block text-xs text-gray-500">
                        {sub.child.classRoom?.name || "Sans classe"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{sub.plan.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {Number(sub.agreedPrice).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(sub.startDate).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {sub.endDate ? new Date(sub.endDate).toLocaleDateString("fr-FR") : "-"}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={async () => {
                            const result = await deleteSubscription(sub.id);
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
                    )}
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
