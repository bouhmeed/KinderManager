"use client";

import {
  getTimetableVersion,
  updateTimetableVersion,
} from "@/app/actions/planning";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useState, useTransition, useEffect, Suspense } from "react";

export default function EditTimetableVersionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      }
    >
      <EditTimetableVersionForm />
    </Suspense>
  );
}

function toDateInput(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

function EditTimetableVersionForm() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const versionId = parseInt(params.id);
  const [version, setVersion] = useState<Awaited<
    ReturnType<typeof getTimetableVersion>
  > | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getTimetableVersion(versionId)
      .then(setVersion)
      .catch(() => setError("Version non trouvée"));
  }, [versionId]);

  const handleSubmit = async (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await updateTimetableVersion(versionId, {
        label: (formData.get("label") as string) || "",
        validFrom: (formData.get("validFrom") as string) || "",
        validTo: (formData.get("validTo") as string) || "",
        isActive: formData.get("isActive") === "on",
      });
      if (result?.error) {
        setError(result.error);
      } else {
        router.push(`/planning/${versionId}`);
      }
    });
  };

  if (!version) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          {error || "Chargement..."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Modifier la version du planning
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
                    defaultValue={version.label}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={version.isActive}
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
                    defaultValue={toDateInput(version.validFrom)}
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
                    defaultValue={
                      version.validTo ? toDateInput(version.validTo) : ""
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Link
                  href={`/planning/${versionId}`}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
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
