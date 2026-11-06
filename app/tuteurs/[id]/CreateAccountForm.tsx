"use client";

import { createGuardianAccount } from "@/app/actions/guardians";
import { useState } from "react";

const inputCls =
  "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50";
const labelCls =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

export default function CreateAccountForm({
  guardianId,
  defaultName,
  defaultEmail,
  onCreated,
}: {
  guardianId: number;
  defaultName: string;
  defaultEmail: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
      >
        + Créer un compte parent
      </button>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const result = await createGuardianAccount(
      guardianId,
      new FormData(e.currentTarget)
    );
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setOpen(false);
      onCreated();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        Créer un compte de connexion parent
      </h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Nom du compte</label>
          <input
            name="accountName"
            type="text"
            defaultValue={defaultName}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            Email du compte <span className="text-red-500">*</span>
          </label>
          <input
            name="accountEmail"
            type="email"
            required
            defaultValue={defaultEmail}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            Mot de passe <span className="text-red-500">*</span>
          </label>
          <input
            name="accountPassword"
            type="password"
            required
            minLength={8}
            className={inputCls}
          />
        </div>
      </div>
      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {pending ? "Création..." : "Créer le compte"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
