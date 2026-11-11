"use client";

import {
  createConversation,
  getMessageableUsers,
  getRequestableChildren,
} from "@/app/actions/communication";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Users = Awaited<ReturnType<typeof getMessageableUsers>>;
type Children = Awaited<ReturnType<typeof getRequestableChildren>>;

const inputCls =
  "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white";
const labelCls =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

export default function NewConversationForm({
  users,
  childOptions,
  initialChildId,
}: {
  users: Users;
  childOptions: Children;
  initialChildId?: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [childId, setChildId] = useState<string>(
    initialChildId ? String(initialChildId) : ""
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const toggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData();
    if (childId) formData.set("childId", childId);
    formData.set("participantIds", JSON.stringify(selected));

    const result = await createConversation(formData);
    setPending(false);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success && result.conversationId) {
      router.push(`/messages/${result.conversationId}`);
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
        {childOptions.length > 0 && (
          <div>
            <label className={labelCls}>Enfant (optionnel)</label>
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className={inputCls}
            >
              <option value="">Conversation générale</option>
              {childOptions.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.firstName} {child.lastName}
                  {child.classRoom ? ` - ${child.classRoom.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={labelCls}>
            Participants <span className="text-red-500">*</span>
          </label>
          {users.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aucun utilisateur disponible pour le moment.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
              {users.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(u.id)}
                    onChange={() => toggle(u.id)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">
                    {u.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {u.role} — {u.email}
                  </span>
                </label>
              ))}
            </div>
          )}
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
            disabled={pending || selected.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {pending ? "Création..." : "Créer la conversation"}
          </button>
        </div>
      </form>
    </div>
  );
}
