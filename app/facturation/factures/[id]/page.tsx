import { getInvoice } from "@/app/actions/billing";
import { requireAuthPage } from "@/lib/auth";
import Link from "next/link";
import PaymentForm from "./PaymentForm";
import InvoiceActions from "./InvoiceActions";

export const instant = false;

const STATUS_LABELS: Record<string, string> = {
  UNPAID: "Impayée",
  PAID: "Payée",
  CANCELLED: "Annulée",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuthPage();
  const { id } = await params;
  const invoiceId = parseInt(id);

  let invoice;
  try {
    invoice = await getInvoice(invoiceId);
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          Facture non trouvée ou accès refusé
        </p>
      </div>
    );
  }

  const isAdmin = user.role === "ADMIN";
  const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(invoice.totalAmount) - paid;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/facturation/factures" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Facture #{invoice.id}
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Enfant</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {invoice.child.firstName} {invoice.child.lastName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {invoice.child.classRoom?.name || "Sans classe"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Émise le</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {new Date(invoice.issueDate).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Échéance</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {invoice.dueDate
                    ? new Date(invoice.dueDate).toLocaleDateString("fr-FR")
                    : "-"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {Number(invoice.totalAmount).toFixed(2)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Payé</h3>
                <p className="text-lg font-medium text-green-600">
                  {paid.toFixed(2)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Reste</h3>
                <p className="text-lg font-medium text-red-600">
                  {remaining.toFixed(2)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Statut</h3>
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    invoice.status === "PAID"
                      ? "bg-green-100 text-green-800"
                      : invoice.status === "CANCELLED"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {STATUS_LABELS[invoice.status] || invoice.status}
                </span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Lignes
            </h2>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Qté</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Prix unit.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {Number(item.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {Number(item.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payments */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Paiements
            </h2>
            {invoice.payments.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Aucun paiement</p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700 mb-4">
                {invoice.payments.map((payment) => (
                  <li key={payment.id} className="py-3 flex justify-between text-sm">
                    <span className="text-gray-900 dark:text-white">
                      {new Date(payment.paymentDate).toLocaleDateString("fr-FR")} — {payment.method}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Number(payment.amount).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {isAdmin && invoice.status !== "CANCELLED" && remaining > 0.001 && (
              <PaymentForm invoiceId={invoice.id} maxAmount={remaining} />
            )}
          </div>

          {isAdmin && (
            <InvoiceActions
              invoiceId={invoice.id}
              status={invoice.status}
              hasPayments={invoice.payments.length > 0}
            />
          )}
        </div>
      </main>
    </div>
  );
}
