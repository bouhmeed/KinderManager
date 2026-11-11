"use client";

import {
  updateInvoiceStatus,
  deleteInvoice,
} from "@/app/actions/billing";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function InvoiceActions({
  invoiceId,
  status,
  hasPayments,
}: {
  invoiceId: number;
  status: string;
  hasPayments: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const run = async (fn: () => Promise<{ error?: string; success?: boolean }>) => {
    setPending(true);
    setError("");
    const result = await fn();
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Gestion de la facture
      </h3>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex flex-wrap gap-3">
        {status !== "PAID" && (
          <button
            onClick={() => run(() => updateInvoiceStatus(invoiceId, "PAID"))}
            disabled={pending}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Marquer payée
          </button>
        )}
        {status === "PAID" && (
          <button
            onClick={() => run(() => updateInvoiceStatus(invoiceId, "UNPAID"))}
            disabled={pending}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Remettre impayée
          </button>
        )}
        {status !== "CANCELLED" && (
          <button
            onClick={() => run(() => updateInvoiceStatus(invoiceId, "CANCELLED"))}
            disabled={pending}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Annuler la facture
          </button>
        )}
        {status === "CANCELLED" && (
          <button
            onClick={() => run(() => updateInvoiceStatus(invoiceId, "UNPAID"))}
            disabled={pending}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Rétablir
          </button>
        )}
        {!hasPayments && (
          <button
            onClick={() => {
              if (confirm("Supprimer définitivement cette facture ?")) {
                run(() => deleteInvoice(invoiceId)).then(() => {
                  if (!error) router.push("/facturation/factures");
                });
              }
            }}
            disabled={pending}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}
