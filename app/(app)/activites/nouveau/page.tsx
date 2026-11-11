"use client";

import { createActivity } from "@/app/actions/activities";
import { ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_LABELS } from "@/lib/schedule-constants";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";

const CATEGORY_COLORS: Record<string, string> = {
  EDUCATIONAL: "#6366f1",
  CARE: "#f43f5e",
  CLUB: "#f59e0b",
  OTHER: "#6b7280",
};

export default function NewActivityPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await createActivity({
        title: (formData.get("title") as string) || "",
        description: (formData.get("description") as string) || "",
        category: (formData.get("category") as string) || "OTHER",
        color: (formData.get("color") as string) || "",
      });
      if (result?.error) {
        setError(result.error);
      } else if (result?.activity) {
        router.push(`/activites/${result.activity.id}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Nouvelle activité
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form action={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Titre *
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  disabled={isPending}
                  placeholder="Ex: Peinture, Musique, Anglais..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  disabled={isPending}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Catégorie *
                  </label>
                  <select
                    name="category"
                    required
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    {ACTIVITY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {ACTIVITY_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    « Club » = inscription obligatoire et confirmation manuelle.
                    Les autres catégories sont des activités normales.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Couleur
                  </label>
                  <select
                    name="color"
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">— Par défaut —</option>
                    {Object.entries(CATEGORY_COLORS).map(([k, v]) => (
                      <option key={k} value={v}>
                        {ACTIVITY_CATEGORY_LABELS[k as keyof typeof ACTIVITY_CATEGORY_LABELS]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Link
                  href="/activites"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isPending ? "Création..." : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
