"use client";

import {
  markNotificationRead,
  sendNotification,
  getMyNotifications,
  getAllUsers,
} from "@/app/actions/communication";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Notifications = Awaited<ReturnType<typeof getMyNotifications>>;
type Users = Awaited<ReturnType<typeof getAllUsers>>;

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white";

export default function NotificationsManager({
  notifications,
  users,
  isAdmin,
}: {
  notifications: Notifications;
  users: Users;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = e.currentTarget;
    const result = await sendNotification(new FormData(form));
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      form.reset();
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Envoyer une notification
          </h2>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <form onSubmit={handleSend} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select name="userId" required className={inputCls} defaultValue="">
              <option value="" disabled>Sélectionner un utilisateur...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
            <input
              name="message"
              required
              placeholder="Message de la notification"
              className={`${inputCls} md:col-span-1`}
            />
            <button
              type="submit"
              disabled={pending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {pending ? "Envoi..." : "Envoyer"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Mes notifications
        </h2>
        {notifications.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Aucune notification
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`py-3 flex items-center justify-between ${
                  n.status === "UNREAD" ? "bg-blue-50 dark:bg-blue-900/10 -mx-3 px-3 rounded" : ""
                }`}
              >
                <div>
                  <p className="text-sm text-gray-900 dark:text-white">{n.message}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                {n.status === "UNREAD" && (
                  <button
                    onClick={async () => {
                      await markNotificationRead(n.id);
                      router.refresh();
                    }}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 text-sm whitespace-nowrap ml-4"
                  >
                    Marquer lue
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
