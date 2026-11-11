"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetUserPassword, setUserActive } from "@/app/actions/users";

const inputCls =
  "px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white";

export default function UserActions({
  userId,
  isActive,
  isSelf,
}: {
  userId: number;
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  const run = async (fn: () => Promise<{ error?: string; success?: boolean } | undefined>) => {
    setError("");
    setSuccess("");
    setPending(true);
    const result = await fn();
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
    return result;
  };

  const handleToggle = () =>
    run(() => setUserActive(userId, !isActive));

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const result = await run(() =>
      resetUserPassword(userId, new FormData(form))
    );
    if (result?.success) {
      form.reset();
      setSuccess("Mot de passe réinitialisé");
      setResetOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        {!resetOpen && (
          <button
            onClick={() => setResetOpen(true)}
            disabled={pending}
            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50"
          >
            Réinitialiser
          </button>
        )}
        {!isSelf && (
          <button
            onClick={handleToggle}
            disabled={pending}
            className={
              isActive
                ? "text-red-600 hover:text-red-800 dark:text-red-400"
                : "text-green-600 hover:text-green-800 dark:text-green-400"
            }
          >
            {isActive ? "Désactiver" : "Activer"}
          </button>
        )}
      </div>

      {resetOpen && (
        <form onSubmit={handleReset} className="flex items-center space-x-2">
          <input
            name="newPassword"
            type="password"
            required
            minLength={8}
            placeholder="Nouveau mot de passe"
            className={inputCls}
          />
          <button
            type="submit"
            disabled={pending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setResetOpen(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            ✕
          </button>
        </form>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-green-600">{success}</p>}
    </div>
  );
}
