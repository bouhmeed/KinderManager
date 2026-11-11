"use client";

import { getChild } from "@/app/actions/children";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import DeleteButton from "./DeleteButton";
import UnlinkGuardianButton from "./UnlinkGuardianButton";
import LinkGuardianButton from "./LinkGuardianButton";
import ChildAvatar from "@/components/ChildAvatar";

export default function ChildDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      }
    >
      <ChildDetail />
    </Suspense>
  );
}

function ChildDetail() {
  const params = useParams<{ id: string }>();
  const childId = parseInt(params.id);
  const [child, setChild] = useState<Awaited<
    ReturnType<typeof getChild>
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChild(childId)
      .then(setChild)
      .catch(() => setLoading(false))
      .finally(() => setLoading(false));
  }, [childId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Enfant non trouvé</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Child Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Informations de l&apos;enfant
              </h2>
              <div className="space-x-2">
                <Link
                  href={`/sante/${child.id}`}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Santé &amp; sécurité
                </Link>
                <Link
                  href={`/enfants/${child.id}/modifier`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Modifier
                </Link>
                <DeleteButton childId={child.id} />
              </div>
            </div>

            <div className="flex items-center space-x-4 mb-4">
              <ChildAvatar
                photo={child.photo}
                firstName={child.firstName}
                lastName={child.lastName}
                size={72}
              />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {child.firstName} {child.lastName}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {child.classRoom?.name || "Non assigné"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Prénom
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {child.firstName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Nom
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {child.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Date de naissance
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {new Date(child.birthDate).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Statut d&apos;inscription
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {child.enrollmentStatus}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Classe
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {child.classRoom?.name || "Non assigné"}
                </p>
              </div>
            </div>
          </div>

          {/* Guardians */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Tuteurs ({child.guardians.length})
              </h2>
              <LinkGuardianButton childId={child.id} />
            </div>

            {child.guardians.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                Aucun tuteur lié
              </p>
            ) : (
              <div className="space-y-4">
                {child.guardians.map((cg) => (
                  <div
                    key={cg.guardian.id}
                    className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {cg.guardian.firstName} {cg.guardian.lastName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {cg.relationshipType}
                        {cg.isLegalGuardian && " • Tuteur légal"}
                        {cg.isPrimaryContact && " • Contact principal"}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {cg.guardian.phone}
                      </p>
                    </div>
                    <div className="space-x-2">
                      <Link
                        href={`/tuteurs/${cg.guardian.id}`}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        Voir
                      </Link>
                      <UnlinkGuardianButton
                        childId={child.id}
                        guardianId={cg.guardian.id}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Health Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Informations de santé
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Allergies ({child.allergies.length})
                </h3>
                {child.allergies.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">
                    Aucune allergie enregistrée
                  </p>
                ) : (
                  <ul className="list-disc disc-inside text-gray-700 dark:text-gray-300">
                    {child.allergies.map((allergy) => (
                      <li key={allergy.id}>
                        {allergy.description} (
                        {allergy.severity === "MILD"
                          ? "Légère"
                          : allergy.severity === "MODERATE"
                            ? "Modérée"
                            : allergy.severity === "SEVERE"
                              ? "Sévère"
                              : allergy.severity}
                        )
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Restrictions alimentaires ({child.foodRestrictions.length})
                </h3>
                {child.foodRestrictions.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">
                    Aucune restriction alimentaire
                  </p>
                ) : (
                  <ul className="list-disc disc-inside text-gray-700 dark:text-gray-300">
                    {child.foodRestrictions.map((restriction) => (
                      <li key={restriction.id}>{restriction.description}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
