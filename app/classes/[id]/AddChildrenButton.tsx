"use client";

import { useState } from "react";
import {
  getUnassignedChildren,
  assignChildrenToClassRoom,
} from "@/app/actions/classrooms";

export default function AddChildrenButton({
  classRoomId,
}: {
  classRoomId: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<
    Awaited<ReturnType<typeof getUnassignedChildren>>
  >([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleOpen = async () => {
    setIsOpen(true);
    setIsLoading(true);
    setError("");
    setSelectedIds([]);
    try {
      const data = await getUnassignedChildren();
      setChildren(data);
    } catch {
      setError("Erreur lors du chargement des enfants");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChild = (childId: number) => {
    setSelectedIds((prev) =>
      prev.includes(childId)
        ? prev.filter((id) => id !== childId)
        : [...prev, childId]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    setError("");
    try {
      const result = await assignChildrenToClassRoom(classRoomId, selectedIds);
      if (result?.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
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
        onClick={handleOpen}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
      >
        + Ajouter un enfant
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Ajouter des enfants à la classe
        </h3>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto mb-4">
          {isLoading ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Chargement...
            </p>
          ) : children.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Aucun enfant sans classe
            </p>
          ) : (
            <div className="space-y-2">
              {children.map((child) => (
                <label
                  key={child.id}
                  className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(child.id)}
                    onChange={() => toggleChild(child.id)}
                    disabled={isSubmitting}
                    className="mr-3 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {child.firstName} {child.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(child.birthDate).toLocaleDateString("fr-FR")}{" "}
                      - {child.enrollmentStatus}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {selectedIds.length} enfant(s) sélectionné(s)
          </span>
          <div className="flex space-x-3">
            <button
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedIds.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Ajout..."
                : `Ajouter (${selectedIds.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
