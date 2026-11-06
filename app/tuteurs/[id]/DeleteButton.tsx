"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteGuardian } from "@/app/actions/guardians";

export default function DeleteButton({ guardianId }: { guardianId: number }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const message = `Êtes-vous sûr de vouloir supprimer ce tuteur?\n\nCette action est irréversible. Si ce tuteur est lié à des enfants, la suppression échouera.`;
    if (!confirm(message)) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteGuardian(guardianId);
      if (result?.error) {
        alert(result.error);
        setIsDeleting(false);
      } else {
        router.push("/tuteurs");
      }
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
