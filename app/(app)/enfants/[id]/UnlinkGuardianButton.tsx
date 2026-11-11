"use client";

import { useState } from "react";
import { unlinkGuardian } from "@/app/actions/children";

export default function UnlinkGuardianButton({
  childId,
  guardianId,
}: {
  childId: number;
  guardianId: number;
}) {
  const [isUnlinking, setIsUnlinking] = useState(false);

  const handleUnlink = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce lien?")) {
      return;
    }

    setIsUnlinking(true);

    try {
      await unlinkGuardian(childId, guardianId);
      window.location.reload();
    } catch {
      alert("Erreur lors de la suppression du lien");
      setIsUnlinking(false);
    }
  };

  return (
    <button
      onClick={handleUnlink}
      disabled={isUnlinking}
      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isUnlinking ? "Suppression..." : "Supprimer le lien"}
    </button>
  );
}
