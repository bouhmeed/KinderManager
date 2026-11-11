"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteChild } from "@/app/actions/children";

export default function DeleteButton({ childId }: { childId: number }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const message = `Êtes-vous sûr de vouloir supprimer cet enfant?\n\nCette action est irréversible et supprimera toutes les données associées (tuteurs, allergies, restrictions alimentaires, etc.).`;
    if (!confirm(message)) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteChild(childId);
      router.push("/enfants");
    } catch {
      alert("Erreur lors de la suppression");
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isDeleting ? "Suppression..." : "Supprimer"}
    </button>
  );
}
