"use client";

import { getEducator } from "@/app/actions/educators";
import { getClassRooms } from "@/app/actions/classrooms";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { AssignClassroomButton, RemoveClassroomButton } from "./AssignmentButtons";

export default function EducatorDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      }
    >
      <EducatorDetail />
    </Suspense>
  );
}

function EducatorDetail() {
  const params = useParams<{ id: string }>();
  const educatorId = parseInt(params.id);
  const [educator, setEducator] = useState<Awaited<
    ReturnType<typeof getEducator>
  > | null>(null);
  const [classRooms, setClassRooms] = useState<
    Awaited<ReturnType<typeof getClassRooms>>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEducator(educatorId), getClassRooms()])
      .then(([educatorData, classRoomsData]) => {
        setEducator(educatorData);
        setClassRooms(classRoomsData);
      })
      .catch(() => setLoading(false))
      .finally(() => setLoading(false));
  }, [educatorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!educator) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          Éducateur non trouvé
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/educateurs" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - {educator.name}
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Informations de l&apos;éducateur
              </h2>
              <Link
                href={`/educateurs/${educator.id}/modifier`}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Modifier
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Nom
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {educator.name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Email
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {educator.email}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Téléphone
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {educator.educatorProfile?.phone || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Statut
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {educator.isActive ? "Actif" : "Inactif"}
                </p>
              </div>
            </div>
          </div>

          {/* Assigned Classrooms */}
          {educator.educatorProfile && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Classes assignées (
                  {educator.educatorProfile.classRooms.length})
                </h2>
                <AssignClassroomButton
                  educatorProfileId={educator.educatorProfile.id}
                  classRooms={classRooms}
                  assignedClassRoomIds={
                    educator.educatorProfile.classRooms.map(
                      (assignment) => assignment.classRoomId
                    )
                  }
                />
              </div>

              {educator.educatorProfile.classRooms.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  Aucune classe assignée
                </p>
              ) : (
                <div className="space-y-3">
                  {educator.educatorProfile.classRooms.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {assignment.classRoom.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {assignment.classRoom.ageGroup} ans - Capacité:{" "}
                          {assignment.classRoom.capacity}
                        </p>
                      </div>
                      <RemoveClassroomButton
                        educatorProfileId={educator.educatorProfile!.id}
                        classRoomId={assignment.classRoomId}
                        classRoomName={assignment.classRoom.name}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
