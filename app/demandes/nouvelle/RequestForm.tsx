"use client";

import { createRequest, getRequestableChildren } from "@/app/actions/communication";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ChildOption = Awaited<ReturnType<typeof getRequestableChildren>>[number];

const REQUEST_TYPES = [
  "Sortie anticipée",
  "Documents",
  "Réunion",
  "Autre",
];

const inputCls =
  "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white";
const labelCls =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

export default function RequestForm({
  childOptions,
}: {
  childOptions: ChildOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const result = await createRequest(new FormData(e.currentTarget));
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else if (result?.success && result.requestId) {
      router.push(`/demandes/${result.requestId}`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={labelCls}>Enfant (optionnel)</label>
          <select name="childId" className={inputCls} defaultValue="">
            <option value="">Demande générale</option>
            {childOptions.map((child) => (
              <option key={child.id} value={child.id}>
                {child.firstName} {child.lastName}
                {child.classRoom ? ` - ${child.classRoom.name}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            Type <span className="text-red-500">*</span>
          </label>
          <select name="type" required className={inputCls} defaultValue="">
            <option value="" disabled>Sélectionner...</option>
            {REQUEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            required
            rows={4}
            placeholder="Décrivez votre demande..."
            className={inputCls}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={pending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {pending ? "Envoi..." : "Soumettre la demande"}
          </button>
        </div>
      </form>
    </div>
  );
}
