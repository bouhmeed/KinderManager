"use client";

import {
  verifyDeclarationDay,
  cancelAbsenceDeclaration,
} from "@/app/actions/absences";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DayRow {
  id: number;
  date: string;
  status: string;
}

export default function DeclarationActions({
  declarationId,
  canVerify,
  isCreator,
  hasPendingDays,
  days,
}: {
  declarationId: number;
  canVerify: boolean;
  isCreator: boolean;
  hasPendingDays: boolean;
  days: DayRow[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<number | "cancel" | null>(null);
  const [error, setError] = useState("");

  const verify = async (dayId: number, action: "CONFIRMED" | "NOT_APPLICABLE") => {
    setPending(dayId);
    setError("");
    const result = await verifyDeclarationDay(dayId, action);
    setPending(null);
    if (result?.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  };

  const cancel = async () => {
    if (
      !window.confirm(
        "Annuler cette déclaration ? Les jours passés et déjà vérifiés seront conservés."
      )
    ) {
      return;
    }
    setPending("cancel");
    setError("");
    const result = await cancelAbsenceDeclaration(declarationId);
    setPending(null);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/absences");
      router.refresh();
    }
  };

  const pendingDays = days.filter((d) => d.status === "PENDING");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Actions
      </h3>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {canVerify && hasPendingDays && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Vérifiez chaque jour : confirmez l&apos;absence ou indiquez que
            l&apos;enfant était présent.
          </p>
          <div className="space-y-3">
            {pendingDays.map((day) => (
              <div
                key={day.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(day.date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => verify(day.id, "CONFIRMED")}
                    disabled={pending !== null}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    Confirmer l&apos;absence
                  </button>
                  <button
                    onClick={() => verify(day.id, "NOT_APPLICABLE")}
                    disabled={pending !== null}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    Enfant présent
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isCreator && (
        <button
          onClick={cancel}
          disabled={pending !== null}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {pending === "cancel" ? "Annulation..." : "Annuler la déclaration"}
        </button>
      )}
    </div>
  );
}
