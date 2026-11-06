"use client";

import {
  createEmergencyContact,
  deleteEmergencyContact,
  createAllergy,
  deleteAllergy,
  createFoodRestriction,
  deleteFoodRestriction,
  createAuthorizedPickupPerson,
  deleteAuthorizedPickupPerson,
  createInsuranceRecord,
  deleteInsuranceRecord,
  createIncident,
  deleteIncident,
  createPickupNotification,
  deletePickupNotification,
  createParentInstruction,
  deleteParentInstruction,
  getChildHealth,
} from "@/app/actions/health";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ChildAvatar from "@/components/ChildAvatar";
import ChildProfileForm from "./ChildProfileForm";

type HealthData = Awaited<ReturnType<typeof getChildHealth>>;

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
const btnCls =
  "bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50";
const delBtnCls =
  "text-red-600 hover:text-red-800 dark:text-red-400 text-sm";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function DeleteButton({
  onDelete,
  disabled,
}: {
  onDelete: () => Promise<{ error?: string; success?: boolean }>;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      disabled={pending || disabled}
      onClick={async () => {
        setPending(true);
        await onDelete();
        router.refresh();
        setPending(false);
      }}
      className={delBtnCls}
    >
      Supprimer
    </button>
  );
}

function AddForm({
  action,
  fields,
  submitLabel,
  hiddenChildId,
}: {
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  fields: {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    options?: { value: string; label: string }[];
    placeholder?: string;
  }[];
  submitLabel: string;
  hiddenChildId: number;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setError("");
    setPending(true);
    const result = await action(new FormData(form));
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      form.reset();
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <input type="hidden" name="childId" value={hiddenChildId} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((f) =>
          f.type === "checkbox" ? (
            <div key={f.name} className="flex items-end pb-2">
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" name={f.name} className="rounded" />
                <span>{f.label}</span>
              </label>
            </div>
          ) : (
            <div key={f.name}>
              <label className={labelCls}>
                {f.label}
                {f.required !== false && (
                  <span className="text-red-500"> *</span>
                )}
              </label>
              {f.options ? (
              <select
                name={f.name}
                required={f.required !== false}
                className={inputCls}
                defaultValue=""
              >
                <option value="" disabled>
                  Sélectionner...
                </option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type || "text"}
                name={f.name}
                required={f.required !== false}
                placeholder={f.placeholder}
                className={inputCls}
              />
            )}
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? "Ajout..." : submitLabel}
      </button>
    </form>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>;
}

function Row({
  children,
  onDelete,
  canDelete,
}: {
  children: React.ReactNode;
  onDelete?: () => Promise<{ error?: string; success?: boolean }>;
  canDelete: boolean;
}) {
  return (
    <li className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="text-sm text-gray-900 dark:text-white">{children}</div>
      {canDelete && onDelete && <DeleteButton onDelete={onDelete} />}
    </li>
  );
}

export default function HealthSections({
  data,
  role,
  viewerId,
}: {
  data: HealthData;
  role: string;
  viewerId: number;
}) {
  const isAdmin = role === "ADMIN";
  const isParent = role === "PARENT";
  const canWrite = isAdmin || isParent;
  const canReport = isAdmin || role === "EDUCATOR";
  const canInstruction = isAdmin || isParent;
  const childId = data.id;

  const canDelete = (createdBy: number | null) =>
    isAdmin || (isParent && createdBy === viewerId);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          <ChildAvatar
            photo={data.photo}
            firstName={data.firstName}
            lastName={data.lastName}
            size={64}
          />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.firstName} {data.lastName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {data.classRoom?.name || "Sans classe"} · Né(e) le{" "}
              {new Date(data.birthDate).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>
        {(isParent || isAdmin) && (
          <ChildProfileForm
            childId={childId}
            firstName={data.firstName}
            lastName={data.lastName}
            birthDate={new Date(data.birthDate).toISOString().slice(0, 10)}
            hasPhoto={!!data.photo}
          />
        )}
      </div>

      {/* Emergency contacts */}
      <Section title="Contacts d'urgence">
        {data.emergencyContacts.length === 0 ? (
          <Empty text="Aucun contact d'urgence" />
        ) : (
          <ul>
            {data.emergencyContacts.map((c) => (
              <Row
                key={c.id}
                canDelete={canDelete(c.createdBy)}
                onDelete={() => deleteEmergencyContact(c.id)}
              >
                {c.name} — {c.relationship} — {c.phone}
              </Row>
            ))}
          </ul>
        )}
        {canWrite && (
          <AddForm
            action={createEmergencyContact}
            hiddenChildId={childId}
            submitLabel="Ajouter un contact"
            fields={[
              { name: "name", label: "Nom", placeholder: "Nom complet" },
              { name: "relationship", label: "Lien", placeholder: "Ex: grand-mère" },
              { name: "phone", label: "Téléphone", placeholder: "06..." },
            ]}
          />
        )}
      </Section>

      {/* Allergies */}
      <Section title="Allergies">
        {data.allergies.length === 0 ? (
          <Empty text="Aucune allergie déclarée" />
        ) : (
          <ul>
            {data.allergies.map((a) => (
              <Row
                key={a.id}
                canDelete={canDelete(a.createdBy)}
                onDelete={() => deleteAllergy(a.id)}
              >
                {a.description} <span className="text-gray-500">({a.severity})</span>
              </Row>
            ))}
          </ul>
        )}
        {canWrite && (
          <AddForm
            action={createAllergy}
            hiddenChildId={childId}
            submitLabel="Ajouter une allergie"
            fields={[
              { name: "description", label: "Description", placeholder: "Ex: arachides" },
              {
                name: "severity",
                label: "Sévérité",
                options: [
                  { value: "LÉGÈRE", label: "Légère" },
                  { value: "MODÉRÉE", label: "Modérée" },
                  { value: "SÉVÈRE", label: "Sévère" },
                ],
              },
            ]}
          />
        )}
      </Section>

      {/* Food restrictions */}
      <Section title="Restrictions alimentaires">
        {data.foodRestrictions.length === 0 ? (
          <Empty text="Aucune restriction alimentaire" />
        ) : (
          <ul>
            {data.foodRestrictions.map((r) => (
              <Row
                key={r.id}
                canDelete={canDelete(r.createdBy)}
                onDelete={() => deleteFoodRestriction(r.id)}
              >
                {r.description}
              </Row>
            ))}
          </ul>
        )}
        {canWrite && (
          <AddForm
            action={createFoodRestriction}
            hiddenChildId={childId}
            submitLabel="Ajouter une restriction"
            fields={[
              { name: "description", label: "Description", placeholder: "Ex: sans gluten" },
            ]}
          />
        )}
      </Section>

      {/* Authorized pickup people */}
      <Section title="Personnes autorisées au départ">
        {data.authorizedPickupPeople.length === 0 ? (
          <Empty text="Aucune personne autorisée" />
        ) : (
          <ul>
            {data.authorizedPickupPeople.map((p) => (
              <Row
                key={p.id}
                canDelete={canDelete(p.createdBy)}
                onDelete={() => deleteAuthorizedPickupPerson(p.id)}
              >
                {p.name} — {p.relationship} — {p.phone}
              </Row>
            ))}
          </ul>
        )}
        {canWrite && (
          <AddForm
            action={createAuthorizedPickupPerson}
            hiddenChildId={childId}
            submitLabel="Ajouter une personne"
            fields={[
              { name: "name", label: "Nom", placeholder: "Nom complet" },
              { name: "relationship", label: "Lien", placeholder: "Ex: oncle" },
              { name: "phone", label: "Téléphone", placeholder: "06..." },
            ]}
          />
        )}
      </Section>

      {/* Insurance */}
      <Section title="Assurance">
        {data.insuranceRecords.length === 0 ? (
          <Empty text="Aucun dossier d'assurance" />
        ) : (
          <ul>
            {data.insuranceRecords.map((ins) => (
              <Row
                key={ins.id}
                canDelete={isAdmin}
                onDelete={() => deleteInsuranceRecord(ins.id)}
              >
                {ins.provider} — Réf: {ins.reference} —{" "}
                {new Date(ins.startDate).toLocaleDateString("fr-FR")} →{" "}
                {new Date(ins.endDate).toLocaleDateString("fr-FR")} — {ins.status}
              </Row>
            ))}
          </ul>
        )}
        {isAdmin && (
          <AddForm
            action={createInsuranceRecord}
            hiddenChildId={childId}
            submitLabel="Ajouter un dossier"
            fields={[
              { name: "provider", label: "Assureur", placeholder: "Nom de la compagnie" },
              { name: "reference", label: "Référence", placeholder: "N° de contrat" },
              { name: "status", label: "Statut", placeholder: "Ex: actif" },
              { name: "startDate", label: "Début", type: "date" },
              { name: "endDate", label: "Fin", type: "date" },
            ]}
          />
        )}
      </Section>

      {/* Incidents */}
      <Section title="Incidents">
        {data.incidents.length === 0 ? (
          <Empty text="Aucun incident enregistré" />
        ) : (
          <ul>
            {data.incidents.map((i) => (
              <li
                key={i.id}
                className="py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(i.createdAt).toLocaleDateString("fr-FR")} —{" "}
                    {i.creator.name}
                    {i.parentInformed && (
                      <span className="ml-2 text-xs text-green-600">
                        Parent informé
                      </span>
                    )}
                  </p>
                  {isAdmin && (
                    <DeleteButton onDelete={() => deleteIncident(i.id)} />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {i.description}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Mesures : {i.actionTaken}
                </p>
              </li>
            ))}
          </ul>
        )}
        {canReport && (
          <AddForm
            action={createIncident}
            hiddenChildId={childId}
            submitLabel="Signaler un incident"
            fields={[
              { name: "description", label: "Description", placeholder: "Décrire l'incident" },
              { name: "actionTaken", label: "Mesures prises", placeholder: "Soins, notification..." },
              { name: "parentInformed", label: "Parent informé", type: "checkbox", required: false },
            ]}
          />
        )}
      </Section>

      {/* Pickup notifications */}
      <Section title="Notifications de départ">
        {data.pickupNotifications.length === 0 ? (
          <Empty text="Aucune notification de départ" />
        ) : (
          <ul>
            {data.pickupNotifications.map((n) => (
              <Row
                key={n.id}
                canDelete={isAdmin}
                onDelete={() => deletePickupNotification(n.id)}
              >
                {n.personName} —{" "}
                {new Date(n.pickupDate).toLocaleString("fr-FR")} — {n.creator.name}
              </Row>
            ))}
          </ul>
        )}
        {canReport && (
          <AddForm
            action={createPickupNotification}
            hiddenChildId={childId}
            submitLabel="Enregistrer un départ"
            fields={[
              { name: "personName", label: "Personne", placeholder: "Nom de la personne" },
              { name: "pickupDate", label: "Date et heure", type: "datetime-local" },
            ]}
          />
        )}
      </Section>

      {/* Parent instructions */}
      <Section title="Consignes des parents">
        {data.parentInstructions.length === 0 ? (
          <Empty text="Aucune consigne" />
        ) : (
          <ul>
            {data.parentInstructions.map((p) => (
              <Row
                key={p.id}
                canDelete={canDelete(p.createdBy)}
                onDelete={() => deleteParentInstruction(p.id)}
              >
                <span className="whitespace-pre-wrap">{p.content}</span>
                <span className="block text-xs text-gray-500 mt-1">
                  {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </Row>
            ))}
          </ul>
        )}
        {canInstruction && (
          <AddForm
            action={createParentInstruction}
            hiddenChildId={childId}
            submitLabel="Ajouter une consigne"
            fields={[
              { name: "content", label: "Consigne", placeholder: "Ex: allergie aux fruits rouges..." },
            ]}
          />
        )}
      </Section>
    </div>
  );
}
