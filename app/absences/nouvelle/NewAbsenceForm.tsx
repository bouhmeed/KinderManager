"use client";

import { createAbsenceDeclaration } from "@/app/actions/absences";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Child {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: Date | string;
  classRoom: { id: number; name: string } | null;
}

export default function NewAbsenceForm({
  declarableChildren,
  userName,
}: {
  declarableChildren: Child[];
  userName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createAbsenceDeclaration(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      if (result?.success && result.declarationId) {
        router.push(`/absences/${result.declarationId}`);
      }
    } catch {
      setError("Erreur lors de la création de la déclaration");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/absences" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Nouvelle déclaration d&apos;absence
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Déclarant : {userName}
            </p>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enfant <span className="text-red-500">*</span>
                </label>
                <select
                  name="childId"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Sélectionnez un enfant...</option>
                  {declarableChildren.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.firstName} {child.lastName}
                      {child.classRoom ? ` - ${child.classRoom.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date d&apos;absence <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date de retour prévue (optionnel)
                </label>
                <input
                  type="date"
                  name="expectedReturnDate"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Motif (optionnel)
                </label>
                <input
                  type="text"
                  name="reason"
                  placeholder="Ex: maladie, rendez-vous médical..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Détails supplémentaires..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Link
                  href="/absences"
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pending ? "Envoi..." : "Soumettre la déclaration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
