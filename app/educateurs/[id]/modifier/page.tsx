"use client";

import {
  updateEducator,
  getEducator,
  assignEducatorToClassRoom,
  removeEducatorFromClassRoom,
} from "@/app/actions/educators";
import { getClassRooms } from "@/app/actions/classrooms";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useState, useTransition, useEffect, Suspense } from "react";

export default function EditEducatorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      }
    >
      <EditEducatorForm />
    </Suspense>
  );
}

function EditEducatorForm() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const educatorId = parseInt(params.id);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [educator, setEducator] = useState<Awaited<
    ReturnType<typeof getEducator>
  > | null>(null);
  const [classRooms, setClassRooms] = useState<
    Awaited<ReturnType<typeof getClassRooms>>
  >([]);

  useEffect(() => {
    Promise.all([getEducator(educatorId), getClassRooms()])
      .then(([educatorData, classRoomsData]) => {
        setEducator(educatorData);
        setClassRooms(classRoomsData);
      })
      .catch(() => {
        setError("Erreur lors du chargement des données");
      });
  }, [educatorId]);

  const handleSubmit = async (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await updateEducator(educatorId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }

      const profile = educator?.educatorProfile;
      if (profile) {
        const selected = formData
          .getAll("classRoomIds")
          .map((v) => parseInt(v as string));
        const current = profile.classRooms.map((a) => a.classRoomId);

        for (const classRoomId of selected.filter(
          (id) => !current.includes(id)
        )) {
          const assignResult = await assignEducatorToClassRoom(
            profile.id,
            classRoomId
          );
          if (assignResult?.error) {
            setError(assignResult.error);
            return;
          }
        }
        for (const classRoomId of current.filter(
          (id) => !selected.includes(id)
        )) {
          const removeResult = await removeEducatorFromClassRoom(
            profile.id,
            classRoomId
          );
          if (removeResult?.error) {
            setError(removeResult.error);
            return;
          }
        }
      }

      router.push(`/educateurs/${educatorId}`);
    });
  };

  if (!educator) {
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
              href={`/educateurs/${educatorId}`}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Modifier {educator.name}
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Modifier l&apos;éducateur
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
                    Nom complet *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    defaultValue={educator.name}
                    required
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={educator.email}
                    required
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Téléphone *
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={educator.educatorProfile?.phone || ""}
                    required
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Nouveau mot de passe{" "}
                    <span className="text-gray-400">(laisser vide pour conserver)</span>
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    minLength={6}
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>

              {educator.educatorProfile && classRooms.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Classes assignées
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {classRooms.map((classRoom) => (
                      <label
                        key={classRoom.id}
                        className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg"
                      >
                        <input
                          type="checkbox"
                          name="classRoomIds"
                          value={classRoom.id}
                          defaultChecked={educator.educatorProfile?.classRooms.some(
                            (a) => a.classRoomId === classRoom.id
                          )}
                          disabled={isPending}
                          className="mr-3 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {classRoom.name} ({classRoom.ageGroup} ans)
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    value="true"
                    defaultChecked={educator.isActive}
                    disabled={isPending}
                    className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Compte actif
                  </span>
                </label>
              </div>

              <div className="flex justify-end space-x-4">
                <Link
                  href={`/educateurs/${educatorId}`}
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
