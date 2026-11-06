"use client";

import { updateAbsenceDeclarationStatus } from "@/app/actions/absences";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StatusButtons({
  declarationId,
  status,
}: {
  declarationId: number;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const update = async (newStatus: string) => {
    setPending(true);
    setError("");
    const result = await updateAbsenceDeclarationStatus(declarationId, newStatus);
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Gestion de la déclaration
      </h3>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex space-x-3">
        {status !== "APPROVED" && (
          <button
            onClick={() => update("APPROVED")}
            disabled={pending}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Approuver
          </button>
        )}
        {status !== "REJECTED" && (
          <button
            onClick={() => update("REJECTED")}
            disabled={pending}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Rejeter
          </button>
        )}
        {status !== "PENDING" && (
          <button
            onClick={() => update("PENDING")}
            disabled={pending}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Remettre en attente
          </button>
        )}
      </div>
    </div>
  );
}
