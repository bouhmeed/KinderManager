"use client";

import { updateChildIdentity } from "@/app/actions/children";
import { useRouter } from "next/navigation";
import { useState } from "react";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white";
const labelCls =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
const btnCls =
  "bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50";

export default function ChildProfileForm({
  childId,
  firstName,
  lastName,
  birthDate,
  hasPhoto,
}: {
  childId: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  hasPhoto: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setError("");
    setPending(true);
    const result = await updateChildIdentity(childId, new FormData(form));
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setEditing(false);
      router.refresh();
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
      >
        Corriger les informations
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Prénom *</label>
          <input
            name="firstName"
            type="text"
            required
            defaultValue={firstName}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Nom *</label>
          <input
            name="lastName"
            type="text"
            required
            defaultValue={lastName}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Date de naissance *</label>
          <input
            name="birthDate"
            type="date"
            required
            defaultValue={birthDate}
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Nouvelle photo</label>
        <input
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className={inputCls}
        />
        {hasPhoto && (
          <label className="flex items-center space-x-2 mt-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" name="removePhoto" className="rounded" />
            <span>Supprimer la photo actuelle</span>
          </label>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex space-x-3">
        <button type="submit" disabled={pending} className={btnCls}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError("");
          }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
