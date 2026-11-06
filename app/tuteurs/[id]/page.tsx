"use client";

import { getGuardian } from "@/app/actions/guardians";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import DeleteButton from "./DeleteButton";
import CreateAccountForm from "./CreateAccountForm";

export default function GuardianDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      }
    >
      <GuardianDetail />
    </Suspense>
  );
}

function GuardianDetail() {
  const params = useParams<{ id: string }>();
  const guardianId = parseInt(params.id);
  const [guardian, setGuardian] = useState<Awaited<
    ReturnType<typeof getGuardian>
  > | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    getGuardian(guardianId)
      .then(setGuardian)
      .catch(() => setLoading(false))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardianId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!guardian) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Tuteur non trouvé</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/tuteurs" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - {guardian.firstName} {guardian.lastName}
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Guardian Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Informations du tuteur
              </h2>
              <div className="space-x-2">
                <Link
                  href={`/tuteurs/${guardian.id}/modifier`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Modifier
                </Link>
                <DeleteButton guardianId={guardian.id} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Prénom
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {guardian.firstName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Nom
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {guardian.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Téléphone
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {guardian.phone}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Email
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {guardian.email || "-"}
                </p>
              </div>
            </div>

            {guardian.user && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Compte utilisateur lié
                </p>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <p>{guardian.user.name}</p>
                  <p>{guardian.user.email}</p>
                  <p className="mt-1">
                    Statut:{" "}
                    <span
                      className={
                        guardian.user.isActive
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {guardian.user.isActive ? "Actif" : "Inactif"}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {!guardian.user && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Aucun compte de connexion lié à ce tuteur
                </p>
                <CreateAccountForm
                  guardianId={guardian.id}
                  defaultName={`${guardian.firstName} ${guardian.lastName}`}
                  defaultEmail={guardian.email || ""}
                  onCreated={load}
                />
              </div>
            )}
          </div>

          {/* Children */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Enfants liés ({guardian.children.length})
            </h2>

            {guardian.children.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                Aucun enfant lié
              </p>
            ) : (
              <div className="space-y-4">
                {guardian.children.map((cg) => (
                  <div
                    key={cg.child.id}
                    className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {cg.child.firstName} {cg.child.lastName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {cg.relationshipType}
                        {cg.isLegalGuardian && " • Tuteur légal"}
                        {cg.isPrimaryContact && " • Contact principal"}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Classe: {cg.child.classRoom?.name || "Non assigné"}
                      </p>
                    </div>
                    <Link
                      href={`/enfants/${cg.child.id}`}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      Voir
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
