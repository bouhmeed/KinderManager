"use client";

import { updateClassRoom } from "@/app/actions/classrooms";
import { getClassRoom } from "@/app/actions/classrooms";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useState, useTransition, useEffect, Suspense } from "react";

export default function EditClassRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      }
    >
      <EditClassRoomForm />
    </Suspense>
  );
}

function EditClassRoomForm() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const classRoomId = parseInt(params.id);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [classRoom, setClassRoom] = useState<Awaited<
    ReturnType<typeof getClassRoom>
  > | null>(null);

  useEffect(() => {
    getClassRoom(classRoomId)
      .then(setClassRoom)
      .catch(() => {
        setError("Erreur lors du chargement des données");
      });
  }, [classRoomId]);

  const handleSubmit = async (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await updateClassRoom(classRoomId, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push(`/classes/${classRoomId}`);
      }
    });
  };

  if (!classRoom) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link
              href={`/classes/${classRoomId}`}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Modifier {classRoom.name}
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Modifier la classe
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form action={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Nom de la classe *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    defaultValue={classRoom.name}
                    required
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ageGroup"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Groupe d&apos;âge *
                  </label>
                  <input
                    id="ageGroup"
                    name="ageGroup"
                    type="number"
                    min="0"
                    defaultValue={classRoom.ageGroup}
                    required
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="capacity"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Capacité *
                  </label>
                  <input
                    id="capacity"
                    name="capacity"
                    type="number"
                    min="0"
                    defaultValue={classRoom.capacity}
                    required
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Link
                  href={`/classes/${classRoomId}`}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Modification..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
