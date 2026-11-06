"use client";

import { useState } from "react";
import {
  assignEducatorToClassRoom,
  removeEducatorFromClassRoom,
} from "@/app/actions/educators";
import { unassignChildFromClassRoom } from "@/app/actions/classrooms";

export function AssignEducatorButton({
  classRoomId,
  educators,
  assignedEducatorProfileIds,
}: {
  classRoomId: number;
  educators: { profileId: number; name: string; email: string }[];
  assignedEducatorProfileIds: number[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [educatorProfileId, setEducatorProfileId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const available = educators.filter(
    (e) => !assignedEducatorProfileIds.includes(e.profileId)
  );

  const handleSubmit = async () => {
    if (!educatorProfileId) return;
    setIsSubmitting(true);
    setError("");
    try {
      const result = await assignEducatorToClassRoom(
        parseInt(educatorProfileId),
        classRoomId
      );
      if (result?.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        setEducatorProfileId("");
        window.location.reload();
      }
    } catch {
      setError("Erreur lors de l'assignation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        disabled={available.length === 0}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + Assigner un éducateur
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <select
        value={educatorProfileId}
        onChange={(e) => setEducatorProfileId(e.target.value)}
        disabled={isSubmitting}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
      >
        <option value="">Sélectionner un éducateur</option>
        {available.map((e) => (
          <option key={e.profileId} value={e.profileId}>
            {e.name} ({e.email})
          </option>
        ))}
      </select>
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !educatorProfileId}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
      >
        {isSubmitting ? "..." : "Assigner"}
      </button>
      <button
        onClick={() => {
          setIsOpen(false);
          setError("");
        }}
        disabled={isSubmitting}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
      >
        Annuler
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}

export function RemoveEducatorButton({
  educatorProfileId,
  classRoomId,
  educatorName,
}: {
  educatorProfileId: number;
  classRoomId: number;
  educatorName: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRemove = async () => {
    if (!confirm(`Retirer "${educatorName}" de cette classe ?`)) return;
    setIsSubmitting(true);
    try {
      const result = await removeEducatorFromClassRoom(
        educatorProfileId,
        classRoomId
      );
      if (result?.error) {
        alert(result.error);
      } else {
        window.location.reload();
      }
    } catch {
      alert("Erreur lors du retrait");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      onClick={handleRemove}
      disabled={isSubmitting}
      className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm disabled:opacity-50"
    >
      {isSubmitting ? "..." : "Retirer"}
    </button>
  );
}

export function RemoveChildButton({
  childId,
  childName,
}: {
  childId: number;
  childName: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRemove = async () => {
    if (
      !confirm(
        `Retirer "${childName}" de cette classe ? L'enfant ne sera pas supprimé.`
      )
    )
      return;
    setIsSubmitting(true);
    try {
      const result = await unassignChildFromClassRoom(childId);
      if (result?.error) {
        alert(result.error);
      } else {
        window.location.reload();
      }
    } catch {
      alert("Erreur lors du retrait");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      onClick={handleRemove}
      disabled={isSubmitting}
      className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm disabled:opacity-50"
    >
      {isSubmitting ? "..." : "Retirer"}
    </button>
  );
}
