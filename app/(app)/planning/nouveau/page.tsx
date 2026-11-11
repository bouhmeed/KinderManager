"use client";

import { createTimetableVersion } from "@/app/actions/planning";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";

export default function NewTimetableVersionPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await createTimetableVersion({
        label: (formData.get("label") as string) || "",
        validFrom: (formData.get("validFrom") as string) || "",
        validTo: (formData.get("validTo") as string) || "",
        isActive: formData.get("isActive") === "on",
      });
      if (result?.error) {
        setError(result.error);
      } else if (result?.version) {
        router.push(`/planning/${result.version.id}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Nouvelle version du planning
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form action={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="label"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Libellé *
                  </label>
                  <input
                    id="label"
                    name="label"
                    type="text"
                    required
                    disabled={isPending}
                    placeholder="Ex: Année scolaire 2026-2027"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked
                      disabled={isPending}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Version active</span>
                  </label>
                </div>

                <div>
                  <label
                    htmlFor="validFrom"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Valide à partir du *
                  </label>
                  <input
                    id="validFrom"
                    name="validFrom"
                    type="date"
                    required
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="validTo"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Valide jusqu&apos;au (optionnel)
                  </label>
                  <input
                    id="validTo"
                    name="validTo"
                    type="date"
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Une seule version active peut couvrir une date donnée. Laissez
                la date de fin vide pour une validité indéterminée.
              </p>

              <div className="flex justify-end space-x-4">
                <Link
                  href="/planning"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
