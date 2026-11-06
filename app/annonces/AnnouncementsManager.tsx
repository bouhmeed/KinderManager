"use client";

import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
} from "@/app/actions/communication";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Announcement = Awaited<ReturnType<typeof getAnnouncements>>[number];

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white";

export default function AnnouncementsManager({
  announcements,
  isAdmin,
}: {
  announcements: Announcement[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = e.currentTarget;
    const result = await createAnnouncement(new FormData(form));
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
            Nouvelle annonce
          </h2>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              name="title"
              required
              placeholder="Titre de l'annonce"
              className={inputCls}
            />
            <textarea
              name="content"
              required
              rows={3}
              placeholder="Contenu de l'annonce..."
              className={inputCls}
            />
            <button
              type="submit"
              disabled={pending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {pending ? "Publication..." : "Publier"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Annonces
        </h2>
        {announcements.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Aucune annonce
          </p>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {a.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={async () => {
                        if (confirm("Supprimer cette annonce ?")) {
                          await deleteAnnouncement(a.id);
                          router.refresh();
                        }
                      }}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                  {a.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
