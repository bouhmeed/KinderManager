"use client";

import { createInvoice, getBillableChildren } from "@/app/actions/billing";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Child = Awaited<ReturnType<typeof getBillableChildren>>[number];

interface ItemRow {
  description: string;
  quantity: string;
  unitPrice: string;
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white";
const labelCls =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export default function InvoiceForm({
  childOptions,
}: {
  childOptions: Child[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<ItemRow[]>([
    { description: "", quantity: "1", unitPrice: "" },
  ]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const total = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData(e.currentTarget);
    formData.set(
      "items",
      JSON.stringify(
        items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        }))
      )
    );

    const result = await createInvoice(formData);
    setPending(false);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success && result.invoiceId) {
      router.push(`/facturation/factures/${result.invoiceId}`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              Enfant <span className="text-red-500">*</span>
            </label>
            <select name="childId" required className={inputCls} defaultValue="">
              <option value="" disabled>Sélectionner...</option>
              {childOptions.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.firstName} {child.lastName}
                  {child.classRoom ? ` - ${child.classRoom.name}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date d&apos;échéance (optionnel)</label>
            <input type="date" name="dueDate" className={inputCls} />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Lignes de facture
            </h3>
            <button
              type="button"
              onClick={() =>
                setItems([...items, { description: "", quantity: "1", unitPrice: "" }])
              }
              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 text-sm"
            >
              + Ajouter une ligne
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-6">
                  <label className={labelCls}>Description</label>
                  <input
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    placeholder="Ex: Mensualité janvier"
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Qté</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-3">
                  <label className={labelCls}>Prix unit.</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-1">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setItems(items.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-800 text-sm pb-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-right">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              Total : {total.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Link
            href="/facturation/factures"
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {pending ? "Création..." : "Créer la facture"}
          </button>
        </div>
      </form>
    </div>
  );
}
