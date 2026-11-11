"use client";

import { resetGuardianAccountPassword } from "@/app/actions/guardians";
import { useState } from "react";

const inputCls =
  "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50";

export default function ResetPasswordForm({
  guardianId,
}: {
  guardianId: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        Réinitialiser le mot de passe
      </button>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setPending(true);
    const form = e.currentTarget;
    const result = await resetGuardianAccountPassword(
      guardianId,
      new FormData(form)
    );
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      form.reset();
      setSuccess("Mot de passe réinitialisé — toutes les sessions ont été déconnectées.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3"
    >
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
        Nouveau mot de passe
      </h4>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
      <div className="flex items-end space-x-3">
        <div className="flex-1">
          <input
            name="newPassword"
            type="password"
            required
            minLength={8}
            placeholder="8 caractères minimum"
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 whitespace-nowrap"
        >
          {pending ? "..." : "Réinitialiser"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
            setSuccess("");
          }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
