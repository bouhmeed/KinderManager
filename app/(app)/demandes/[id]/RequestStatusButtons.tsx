"use client";

import { updateRequestStatus } from "@/app/actions/communication";
import { useRouter } from "next/navigation";
import { useState } from "react";

const inputCls =
  "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white";

export default function RequestStatusButtons({
  requestId,
  type,
  status,
  role,
}: {
  requestId: number;
  type: string;
  status: string;
  role: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const isAdmin = role === "ADMIN";
  const isDocument = type === "DOCUMENTS";

  const update = async (newStatus: string, response?: string) => {
    setPending(true);
    setError("");
    const result = await updateRequestStatus(requestId, newStatus, response);
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setRejectMode(false);
      setRejectReason("");
      router.refresh();
    }
  };

  const btn =
    "px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-white";

  // ---- Document request workflow ----
  if (isDocument) {
    const adminActions: {
      label: string;
      target: string;
      cls: string;
      isReject?: boolean;
    }[] = [];
    if (status === "PENDING") {
      adminActions.push({
        label: "Prise en charge",
        target: "IN_PROGRESS",
        cls: "bg-blue-600 hover:bg-blue-700",
      });
    }
    if (status === "IN_PROGRESS") {
      adminActions.push({
        label: "Marquer prête",
        target: "READY",
        cls: "bg-teal-600 hover:bg-teal-700",
      });
    }
    if (status === "READY") {
      adminActions.push({
        label: "Marquer terminée",
        target: "COMPLETED",
        cls: "bg-green-600 hover:bg-green-700",
      });
    }
    if (status !== "REJECTED" && status !== "CANCELLED") {
      adminActions.push({
        label: "Rejeter",
        target: "REJECTED",
        cls: "bg-red-600 hover:bg-red-700",
        isReject: true,
      });
    }
    if (status !== "PENDING") {
      adminActions.push({
        label: "Remettre en attente",
        target: "PENDING",
        cls: "bg-gray-600 hover:bg-gray-700",
      });
    }

    const educatorActions: {
      label: string;
      target: string;
      cls: string;
      isReject?: boolean;
    }[] =
      status === "PENDING"
        ? [
            {
              label: "Prise en charge",
              target: "IN_PROGRESS",
              cls: "bg-blue-600 hover:bg-blue-700",
            },
          ]
        : status === "IN_PROGRESS"
          ? [
              {
                label: "Marquer prête",
                target: "READY",
                cls: "bg-teal-600 hover:bg-teal-700",
              },
            ]
          : [];

    const actions = isAdmin ? adminActions : educatorActions;

    return (
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Traitement de la demande de documents
        </h3>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

        {rejectMode ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Motif du rejet <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Expliquez pourquoi la demande est rejetée..."
              className={inputCls}
            />
            <div className="flex space-x-3">
              <button
                onClick={() => update("REJECTED", rejectReason)}
                disabled={pending || !rejectReason.trim()}
                className={`${btn} bg-red-600 hover:bg-red-700 disabled:opacity-50`}
              >
                {pending ? "Envoi..." : "Confirmer le rejet"}
              </button>
              <button
                onClick={() => {
                  setRejectMode(false);
                  setRejectReason("");
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {actions.map((a) =>
              a.isReject ? (
                <button
                  key={a.target}
                  onClick={() => setRejectMode(true)}
                  disabled={pending}
                  className={`${btn} ${a.cls}`}
                >
                  {a.label}
                </button>
              ) : (
                <button
                  key={a.target}
                  onClick={() => update(a.target)}
                  disabled={pending}
                  className={`${btn} ${a.cls}`}
                >
                  {a.label}
                </button>
              )
            )}
            {actions.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aucune action disponible pour ce statut.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---- Legacy requests (SORTIE_ANTICIPEE, REUNION, AUTRE) ----
  return (
    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Gestion de la demande
      </h3>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex space-x-3">
        {status !== "APPROVED" && (
          <button
            onClick={() => update("APPROVED")}
            disabled={pending}
            className={`${btn} bg-green-600 hover:bg-green-700`}
          >
            Approuver
          </button>
        )}
        {status !== "REJECTED" && (
          <button
            onClick={() => setRejectMode(true)}
            disabled={pending}
            className={`${btn} bg-red-600 hover:bg-red-700`}
          >
            Rejeter
          </button>
        )}
        {status !== "PENDING" && (
          <button
            onClick={() => update("PENDING")}
            disabled={pending}
            className={`${btn} bg-gray-600 hover:bg-gray-700`}
          >
            Remettre en attente
          </button>
        )}
      </div>

      {rejectMode && (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Motif du rejet <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Expliquez pourquoi la demande est rejetée..."
            className={inputCls}
          />
          <div className="flex space-x-3">
            <button
              onClick={() => update("REJECTED", rejectReason)}
              disabled={pending || !rejectReason.trim()}
              className={`${btn} bg-red-600 hover:bg-red-700 disabled:opacity-50`}
            >
              {pending ? "Envoi..." : "Confirmer le rejet"}
            </button>
            <button
              onClick={() => {
                setRejectMode(false);
                setRejectReason("");
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
