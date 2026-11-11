"use client";

import { createChild } from "@/app/actions/children";
import { getClassRooms } from "@/app/actions/classrooms";
import { getGuardianOptions } from "@/app/actions/guardians";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition, useEffect } from "react";

const inputCls =
  "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50";
const labelCls =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

export default function NewChildPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [classRooms, setClassRooms] = useState<
    Awaited<ReturnType<typeof getClassRooms>>
  >([]);
  const [guardians, setGuardians] = useState<
    Awaited<ReturnType<typeof getGuardianOptions>>
  >([]);
  const [guardianMode, setGuardianMode] = useState<
    "none" | "existing" | "new"
  >("none");
  const [createAccount, setCreateAccount] = useState(false);
  const [allergies, setAllergies] = useState<
    { description: string; severity: string }[]
  >([]);
  const [contacts, setContacts] = useState<
    { name: string; relationship: string; phone: string }[]
  >([]);

  useEffect(() => {
    getClassRooms()
      .then(setClassRooms)
      .catch(() => {
        setError("Erreur lors du chargement des classes");
      });
    getGuardianOptions()
      .then(setGuardians)
      .catch(() => {});
  }, []);

  const handleSubmit = async (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await createChild(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.child) {
        router.push(`/enfants/${result.child.id}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Enregistrer un nouvel enfant
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
                  <label htmlFor="photo" className={labelCls}>
                    Photo de l&apos;enfant
                  </label>
                  <input
                    id="photo"
                    name="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={isPending}
                    className={inputCls}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    JPG, PNG, WebP ou GIF — 3 Mo max
                  </p>
                </div>
              </div>

              {/* ---------- Santé initiale ---------- */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Santé (optionnel)
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Informations critiques à connaître dès l&apos;inscription.
                </p>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Allergies
                      </h4>
                      <button
                        type="button"
                        onClick={() =>
                          setAllergies([
                            ...allergies,
                            { description: "", severity: "MODERATE" },
                          ])
                        }
                        disabled={isPending}
                        className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                      >
                        + Ajouter
                      </button>
                    </div>
                    {allergies.map((a, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-1 md:grid-cols-[1fr_180px_40px] gap-3 mb-3"
                      >
                        <input
                          name={`allergyDesc_${i}`}
                          type="text"
                          placeholder="Ex: arachides"
                          value={a.description}
                          onChange={(e) => {
                            const next = [...allergies];
                            next[i] = { ...next[i], description: e.target.value };
                            setAllergies(next);
                          }}
                          disabled={isPending}
                          className={inputCls}
                        />
                        <select
                          name={`allergySeverity_${i}`}
                          value={a.severity}
                          onChange={(e) => {
                            const next = [...allergies];
                            next[i] = { ...next[i], severity: e.target.value };
                            setAllergies(next);
                          }}
                          disabled={isPending}
                          className={inputCls}
                        >
                          <option value="MILD">Légère</option>
                          <option value="MODERATE">Modérée</option>
                          <option value="SEVERE">Sévère</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setAllergies(allergies.filter((_, j) => j !== i))
                          }
                          disabled={isPending}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Contacts d&apos;urgence
                      </h4>
                      <button
                        type="button"
                        onClick={() =>
                          setContacts([
                            ...contacts,
                            { name: "", relationship: "", phone: "" },
                          ])
                        }
                        disabled={isPending}
                        className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                      >
                        + Ajouter
                      </button>
                    </div>
                    {contacts.map((c, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_40px] gap-3 mb-3"
                      >
                        <input
                          name={`contactName_${i}`}
                          type="text"
                          placeholder="Nom complet"
                          value={c.name}
                          onChange={(e) => {
                            const next = [...contacts];
                            next[i] = { ...next[i], name: e.target.value };
                            setContacts(next);
                          }}
                          disabled={isPending}
                          className={inputCls}
                        />
                        <input
                          name={`contactRel_${i}`}
                          type="text"
                          placeholder="Lien (ex: grand-mère)"
                          value={c.relationship}
                          onChange={(e) => {
                            const next = [...contacts];
                            next[i] = { ...next[i], relationship: e.target.value };
                            setContacts(next);
                          }}
                          disabled={isPending}
                          className={inputCls}
                        />
                        <input
                          name={`contactPhone_${i}`}
                          type="tel"
                          placeholder="Téléphone"
                          value={c.phone}
                          onChange={(e) => {
                            const next = [...contacts];
                            next[i] = { ...next[i], phone: e.target.value };
                            setContacts(next);
                          }}
                          disabled={isPending}
                          className={inputCls}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setContacts(contacts.filter((_, j) => j !== i))
                          }
                          disabled={isPending}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ---------- Tuteur ---------- */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Tuteur / Parent
                </h3>
                <input
                  type="hidden"
                  name="guardianMode"
                  value={guardianMode}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="guardianModeSelect" className={labelCls}>
                      Lier un tuteur
                    </label>
                    <select
                      id="guardianModeSelect"
                      value={guardianMode}
                      onChange={(e) =>
                        setGuardianMode(
                          e.target.value as "none" | "existing" | "new"
                        )
                      }
                      disabled={isPending}
                      className={inputCls}
                    >
                      <option value="none">Aucun pour le moment</option>
                      <option value="existing">Tuteur existant</option>
                      <option value="new">Créer un nouveau tuteur</option>
                    </select>
                  </div>

                  {guardianMode !== "none" && (
                    <>
                      <div>
                        <label htmlFor="relationshipType" className={labelCls}>
                          Type de relation *
                        </label>
                        <input
                          id="relationshipType"
                          name="relationshipType"
                          type="text"
                          required
                          placeholder="Ex: Père, Mère, Grand-père..."
                          disabled={isPending}
                          className={inputCls}
                        />
                      </div>

                      <div className="flex items-end space-x-6 pb-2">
                        <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            name="isLegalGuardian"
                            disabled={isPending}
                            className="rounded"
                          />
                          <span>Tuteur légal</span>
                        </label>
                        <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            name="isPrimaryContact"
                            disabled={isPending}
                            className="rounded"
                          />
                          <span>Contact principal</span>
                        </label>
                      </div>
                    </>
                  )}
                </div>

                {guardianMode === "existing" && (
                  <div className="mt-4">
                    <label htmlFor="guardianId" className={labelCls}>
                      Tuteur *
                    </label>
                    <select
                      id="guardianId"
                      name="guardianId"
                      required
                      disabled={isPending}
                      className={inputCls}
                    >
                      <option value="">Sélectionner un tuteur</option>
                      {guardians.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.firstName} {g.lastName} — {g.phone}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {guardianMode === "new" && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="guardianFirstName" className={labelCls}>
                          Prénom du tuteur *
                        </label>
                        <input
                          id="guardianFirstName"
                          name="guardianFirstName"
                          type="text"
                          required
                          disabled={isPending}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label htmlFor="guardianLastName" className={labelCls}>
                          Nom du tuteur *
                        </label>
                        <input
                          id="guardianLastName"
                          name="guardianLastName"
                          type="text"
                          required
                          disabled={isPending}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label htmlFor="guardianPhone" className={labelCls}>
                          Téléphone *
                        </label>
                        <input
                          id="guardianPhone"
                          name="guardianPhone"
                          type="tel"
                          required
                          placeholder="06..."
                          disabled={isPending}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label htmlFor="guardianEmail" className={labelCls}>
                          Email (contact)
                        </label>
                        <input
                          id="guardianEmail"
                          name="guardianEmail"
                          type="email"
                          disabled={isPending}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={createAccount}
                          onChange={(e) => setCreateAccount(e.target.checked)}
                          disabled={isPending}
                          className="rounded"
                        />
                        <span>
                          Créer aussi un compte de connexion parent
                        </span>
                      </label>

                      {createAccount && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <input
                            type="hidden"
                            name="createAccount"
                            value="on"
                          />
                          <div>
                            <label htmlFor="accountName" className={labelCls}>
                              Nom du compte
                            </label>
                            <input
                              id="accountName"
                              name="accountName"
                              type="text"
                              placeholder="Prénom Nom (défaut)"
                              disabled={isPending}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label htmlFor="accountEmail" className={labelCls}>
                              Email du compte *
                            </label>
                            <input
                              id="accountEmail"
                              name="accountEmail"
                              type="email"
                              required={createAccount}
                              disabled={isPending}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="accountPassword"
                              className={labelCls}
                            >
                              Mot de passe *
                            </label>
                            <input
                              id="accountPassword"
                              name="accountPassword"
                              type="password"
                              required={createAccount}
                              minLength={8}
                              disabled={isPending}
                              className={inputCls}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4">
                <Link
                  href="/enfants"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Création..." : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
