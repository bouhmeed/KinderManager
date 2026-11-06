"use client";

import { updateChild } from "@/app/actions/children";
import { getChild } from "@/app/actions/children";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useState, useTransition, useEffect, Suspense } from "react";
import { getClassRooms } from "@/app/actions/classrooms";

export default function EditChildPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      }
    >
      <EditChildForm />
    </Suspense>
  );
}

function EditChildForm() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const childId = parseInt(params.id);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [child, setChild] = useState<Awaited<
    ReturnType<typeof getChild>
  > | null>(null);
  const [classRooms, setClassRooms] = useState<
    Awaited<ReturnType<typeof getClassRooms>>
  >([]);

  useEffect(() => {
    Promise.all([getChild(childId), getClassRooms()]).then(
      ([childData, classRoomsData]) => {
        setChild(childData);
        setClassRooms(classRoomsData);
      }
    ).catch(() => {
      setError("Erreur lors du chargement des données");
    });
  }, [childId]);

  const handleSubmit = async (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await updateChild(childId, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push(`/enfants/${childId}`);
      }
    });
  };

  if (!child) {
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
              href={`/enfants/${childId}`}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Modifier {child.firstName} {child.lastName}
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Modifier les informations de l&apos;enfant
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
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Prénom *
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    defaultValue={child.firstName}
                    required
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Nom *
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    defaultValue={child.lastName}
                    required
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="birthDate"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Date de naissance *
                  </label>
                  <input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    defaultValue={new Date(child.birthDate)
                      .toISOString()
                      .split("T")[0]}
                    required
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="enrollmentStatus"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Statut d&apos;inscription *
                  </label>
                  <select
                    id="enrollmentStatus"
                    name="enrollmentStatus"
                    defaultValue={child.enrollmentStatus}
                    required
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  >
                    <option value="INSCRIT">Inscrit</option>
                    <option value="EN_ATTENTE">En attente</option>
                    <option value="INACTIF">Inactif</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="classRoomId"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Classe
                  </label>
                  <select
                    id="classRoomId"
                    name="classRoomId"
                    defaultValue={child.classRoomId || ""}
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  >
                    <option value="">Non assigné</option>
                    {classRooms.map((classRoom) => (
                      <option key={classRoom.id} value={classRoom.id}>
                        {classRoom.name} ({classRoom.ageGroup} ans)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="photo"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Photo de l&apos;enfant
                  </label>
                  {child.photo && (
                    <div className="mb-2 flex items-center space-x-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={child.photo}
                        alt="Photo actuelle"
                        className="w-16 h-16 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                      />
                      <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          name="removePhoto"
                          disabled={isPending}
                          className="rounded"
                        />
                        <span>Supprimer la photo</span>
                      </label>
                    </div>
                  )}
                  <input
                    id="photo"
                    name="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={isPending}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    JPG, PNG, WebP ou GIF — 3 Mo max
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Link
                  href={`/enfants/${childId}`}
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
