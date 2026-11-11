"use client";

import { useState } from "react";
import { linkGuardian } from "@/app/actions/children";
import { getGuardians } from "@/app/actions/guardians";

export default function LinkGuardianButton({ childId }: { childId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [guardians, setGuardians] = useState<
    Awaited<ReturnType<typeof getGuardians>>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleOpen = async () => {
    const data = await getGuardians();
    setGuardians(data);
    setIsOpen(true);
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError("");

    try {
      const result = await linkGuardian(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        window.location.reload();
      }
    } catch {
      setError("Erreur lors de la liaison");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
      >
        + Lier un tuteur
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Lier un tuteur
        </h3>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="childId" value={childId} />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tuteur *
            </label>
            <select
              name="guardianId"
              required
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
            >
              <option value="">Sélectionner un tuteur</option>
              {guardians.map((guardian) => (
                <option key={guardian.id} value={guardian.id}>
                  {guardian.firstName} {guardian.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type de relation *
            </label>
            <input
              type="text"
              name="relationshipType"
              required
              placeholder="Ex: Père, Mère, Grand-père..."
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isLegalGuardian"
                value="true"
                disabled={isSubmitting}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Tuteur légal
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="isPrimaryContact"
                value="true"
                disabled={isSubmitting}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Contact principal
              </span>
            </label>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Liaison..." : "Lier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
