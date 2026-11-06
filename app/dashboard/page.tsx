import { getCurrentUser } from "@/lib/auth";
import { getParentChildIds } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import ChildAvatar from "@/components/ChildAvatar";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

export const instant = false;

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const myChildren =
    user.role === "PARENT"
      ? await prisma.child.findMany({
          where: { id: { in: await getParentChildIds(user.id) } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photo: true,
            classRoom: { select: { name: true } },
          },
          orderBy: { firstName: "asc" },
        })
      : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                KinderManager
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 dark:text-gray-300">
                {user.name} ({user.role})
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Tableau de bord
            </h2>
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Bienvenue, {user.name}!
                </h3>
                <p className="text-blue-700 dark:text-blue-300 mt-2">
                  Vous êtes connecté en tant que {user.role}.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Rôle
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">{user.role}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Email
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">{user.email}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Statut
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    {user.isActive ? "Actif" : "Inactif"}
                  </p>
                </div>
              </div>

              {user.role === "ADMIN" && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Gestion
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link
                      href="/enfants"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Gérer les enfants
                    </Link>
                    <Link
                      href="/tuteurs"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Gérer les tuteurs
                    </Link>
                    <Link
                      href="/classes"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Gérer les classes
                    </Link>
                    <Link
                      href="/educateurs"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Gérer les éducateurs
                    </Link>
                    <Link
                      href="/attendance"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Gestion des présences
                    </Link>
                    <Link
                      href="/absences"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Gestion des absences
                    </Link>
                    <Link
                      href="/facturation"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Facturation
                    </Link>
                    <Link
                      href="/annonces"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Annonces
                    </Link>
                    <Link
                      href="/demandes"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Demandes
                    </Link>
                    <Link
                      href="/messages"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Messages
                    </Link>
                    <Link
                      href="/notifications"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Notifications
                    </Link>
                  </div>
                </div>
              )}

              {user.role === "EDUCATOR" && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Présences
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link
                      href="/attendance"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Présences de mes classes
                    </Link>
                    <Link
                      href="/absences"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Absences de mes classes
                    </Link>
                    <Link
                      href="/demandes"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Demandes
                    </Link>
                    <Link
                      href="/messages"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Messages
                    </Link>
                    <Link
                      href="/annonces"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Annonces
                    </Link>
                    <Link
                      href="/notifications"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Notifications
                    </Link>
                  </div>
                </div>
              )}

              {user.role === "PARENT" && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Mes enfants
                  </h3>
                  {myChildren.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Aucun enfant n&apos;est associé à votre compte.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {myChildren.map((child) => (
                        <div
                          key={child.id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                        >
                          <div className="flex items-center space-x-3">
                            <ChildAvatar
                              photo={child.photo}
                              firstName={child.firstName}
                              lastName={child.lastName}
            />
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {child.firstName} {child.lastName}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                {child.classRoom?.name || "Sans classe"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/sante/${child.id}`}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                            >
                              Santé &amp; infos
                            </Link>
                            <Link
                              href={`/attendance/enfant/${child.id}`}
                              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                            >
                              Présences
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link
                      href="/attendance"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Présences de mes enfants
                    </Link>
                    <Link
                      href="/absences"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Déclarer une absence
                    </Link>
                    <Link
                      href="/facturation"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Factures de mes enfants
                    </Link>
                    <Link
                      href="/demandes"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Mes demandes
                    </Link>
                    <Link
                      href="/messages"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Messages
                    </Link>
                    <Link
                      href="/annonces"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Annonces
                    </Link>
                    <Link
                      href="/notifications"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
                    >
                      Notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
