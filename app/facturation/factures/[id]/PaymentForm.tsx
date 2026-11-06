"use client";

import { addPayment } from "@/app/actions/billing";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PaymentForm({
  invoiceId,
  maxAmount,
}: {
  invoiceId: number;
  maxAmount: number;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = e.currentTarget;
    const result = await addPayment(new FormData(form));
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      form.reset();
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-600 pt-4">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <h3 className="font-medium text-gray-900 dark:text-white mb-3">
        Enregistrer un paiement
      </h3>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Montant (€) *
          </label>
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0.01"
            max={maxAmount}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Méthode *
          </label>
          <select
            name="method"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
            defaultValue=""
          >
            <option value="" disabled>Sélectionner...</option>
            <option value="ESPECES">Espèces</option>
            <option value="CARTE">Carte</option>
            <option value="VIREMENT">Virement</option>
            <option value="CHEQUE">Chèque</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date
          </label>
          <input
            type="date"
            name="paymentDate"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {pending ? "Enregistrement..." : "Ajouter"}
          </button>
        </div>
      </div>
    </form>
  );
}
