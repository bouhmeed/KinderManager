import { getAttendanceHome } from "@/app/actions/attendance";
import { requireAuthPage } from "@/lib/auth";
import Link from "next/link";

export const instant = false;

export default async function AttendancePage() {
  const user = await requireAuthPage();
  const home = await getAttendanceHome();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/dashboard" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Présences
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user.role === "PARENT"
                  ? "Présences de mes enfants"
                  : "Présences par classe"}
              </h2>
              {user.role !== "PARENT" && (
                <Link
                  href="/attendance/historique"
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Historique
                </Link>
              )}
            </div>

            {home.role === "PARENT" ? (
              home.children.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                  Aucun enfant lié à votre compte
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {home.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/attendance/enfant/${child.id}`}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <p className="font-medium text-gray-900 dark:text-white">
                        {child.firstName} {child.lastName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {child.classRoom?.name || "Sans classe"}
                      </p>
                    </Link>
                  ))}
                </div>
              )
            ) : home.classRooms.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                {user.role === "EDUCATOR"
                  ? "Aucune classe ne vous est assignée"
                  : "Aucune classe enregistrée"}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {home.classRooms.map((classRoom) => (
                  <Link
                    key={classRoom.id}
                    href={`/attendance/classe/${classRoom.id}`}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <p className="font-medium text-gray-900 dark:text-white">
                      {classRoom.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {classRoom.ageGroup} ans
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
