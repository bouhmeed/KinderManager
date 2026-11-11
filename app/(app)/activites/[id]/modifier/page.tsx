"use client";

import { getActivity, updateActivity } from "@/app/actions/activities";
import { ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_LABELS } from "@/lib/schedule-constants";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useState, useTransition, useEffect, Suspense } from "react";

export default function EditActivityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><p>Chargement...</p></div>}>
      <EditActivityForm />
    </Suspense>
  );
}

function EditActivityForm() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const activityId = parseInt(params.id);
  const [activity, setActivity] = useState<Awaited<ReturnType<typeof getActivity>> | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getActivity(activityId).then(setActivity).catch(() => setError("Activité non trouvée"));
  }, [activityId]);

  const handleSubmit = async (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await updateActivity(activityId, {
        title: (formData.get("title") as string) || "",
        description: (formData.get("description") as string) || "",
        category: (formData.get("category") as string) || "OTHER",
        color: (formData.get("color") as string) || "",
        isActive: formData.get("isActive") === "on",
      });
      if (result?.error) setError(result.error);
      else router.push(`/activites/${activityId}`);
    });
  };

  if (!activity) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><p className="text-gray-500">{error || "Chargement..."}</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Modifier l&apos;activité</h2>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>}
            <form action={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Titre *</label>
                <input name="title" type="text" required defaultValue={activity.title} disabled={isPending}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea name="description" rows={3} defaultValue={activity.description ?? ""} disabled={isPending}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Catégorie *</label>
                  <select name="category" defaultValue={activity.category} disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white">
                    {ACTIVITY_CATEGORIES.map((c) => <option key={c} value={c}>{ACTIVITY_CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Couleur</label>
                  <input name="color" type="text" defaultValue={activity.color ?? ""} disabled={isPending} placeholder="#6366f1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" name="isActive" defaultChecked={activity.isActive} disabled={isPending} className="rounded border-gray-300 text-indigo-600" />
                <span>Activité active</span>
              </label>
              <div className="flex justify-end space-x-4">
                <Link href={`/activites/${activityId}`} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Annuler</Link>
                <button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg disabled:opacity-50">
                  {isPending ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
