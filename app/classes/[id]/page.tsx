"use client";

import { getClassRoom } from "@/app/actions/classrooms";
import { getEducators } from "@/app/actions/educators";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import {
  AssignEducatorButton,
  RemoveEducatorButton,
  RemoveChildButton,
} from "./AssignmentButtons";
import AddChildrenButton from "./AddChildrenButton";

export default function ClassRoomDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      }
    >
      <ClassRoomDetail />
    </Suspense>
  );
}

function ClassRoomDetail() {
  const params = useParams<{ id: string }>();
  const classRoomId = parseInt(params.id);
  const [classRoom, setClassRoom] = useState<Awaited<
    ReturnType<typeof getClassRoom>
  > | null>(null);
  const [educators, setEducators] = useState<
    Awaited<ReturnType<typeof getEducators>>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getClassRoom(classRoomId), getEducators()])
      .then(([classRoomData, educatorsData]) => {
        setClassRoom(classRoomData);
        setEducators(educatorsData);
      })
      .catch(() => setLoading(false))
      .finally(() => setLoading(false));
  }, [classRoomId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!classRoom) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Classe non trouvée</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/classes" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - {classRoom.name}
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Class Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Informations de la classe
              </h2>
              <Link
                href={`/classes/${classRoom.id}/modifier`}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Modifier
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Nom
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {classRoom.name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Groupe d&apos;âge
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {classRoom.ageGroup} ans
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Capacité
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {classRoom.capacity} enfant(s)
                </p>
              </div>
            </div>
          </div>

          {/* Educators */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Éducateurs assignés ({classRoom.educators.length})
              </h2>
              <AssignEducatorButton
                classRoomId={classRoom.id}
                educators={educators
                  .filter((e) => e.educatorProfile)
                  .map((e) => ({
                    profileId: e.educatorProfile!.id,
                    name: e.name,
                    email: e.email,
                  }))}
                assignedEducatorProfileIds={classRoom.educators.map(
                  (assignment) => assignment.educatorId
                )}
              />
            </div>

            {classRoom.educators.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                Aucun éducateur assigné à cette classe
              </p>
            ) : (
              <div className="space-y-3">
                {classRoom.educators.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {assignment.educator.user.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {assignment.educator.user.email} -{" "}
                        {assignment.educator.phone}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/educateurs/${assignment.educator.user.id}`}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm"
                      >
                        Voir
                      </Link>
                      <RemoveEducatorButton
                        educatorProfileId={assignment.educatorId}
                        classRoomId={classRoom.id}
                        educatorName={assignment.educator.user.name}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Children */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Enfants ({classRoom.children.length})
              </h2>
              <AddChildrenButton classRoomId={classRoom.id} />
            </div>

            {classRoom.children.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                Aucun enfant assigné à cette classe
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Nom
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date de naissance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {classRoom.children.map((child) => (
                      <tr key={child.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {child.firstName} {child.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(child.birthDate).toLocaleDateString("fr-FR")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {child.enrollmentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                          <Link
                            href={`/enfants/${child.id}`}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            Voir
                          </Link>
                          <RemoveChildButton
                            childId={child.id}
                            childName={`${child.firstName} ${child.lastName}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
