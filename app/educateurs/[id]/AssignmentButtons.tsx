"use client";

import { useState } from "react";
import {
  assignEducatorToClassRoom,
  removeEducatorFromClassRoom,
} from "@/app/actions/educators";

export function AssignClassroomButton({
  educatorProfileId,
  classRooms,
  assignedClassRoomIds,
}: {
  educatorProfileId: number;
  classRooms: { id: number; name: string; ageGroup: number }[];
  assignedClassRoomIds: number[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [classRoomId, setClassRoomId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const available = classRooms.filter(
    (c) => !assignedClassRoomIds.includes(c.id)
  );

  const handleSubmit = async () => {
    if (!classRoomId) return;
    setIsSubmitting(true);
    setError("");
    try {
      const result = await assignEducatorToClassRoom(
        educatorProfileId,
        parseInt(classRoomId)
      );
      if (result?.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        setClassRoomId("");
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
        + Assigner une classe
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <select
        value={classRoomId}
        onChange={(e) => setClassRoomId(e.target.value)}
        disabled={isSubmitting}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
      >
        <option value="">Sélectionner une classe</option>
        {available.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.ageGroup} ans)
          </option>
        ))}
      </select>
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !classRoomId}
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

export function RemoveClassroomButton({
  educatorProfileId,
  classRoomId,
  classRoomName,
}: {
  educatorProfileId: number;
  classRoomId: number;
  classRoomName: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRemove = async () => {
    if (!confirm(`Retirer la classe "${classRoomName}" ?`)) return;
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
