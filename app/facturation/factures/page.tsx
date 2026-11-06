import { getInvoices } from "@/app/actions/billing";
import { requireAuthPage } from "@/lib/auth";
import Link from "next/link";

export const instant = false;

const STATUS_LABELS: Record<string, string> = {
  UNPAID: "Impayée",
  PAID: "Payée",
  CANCELLED: "Annulée",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; status?: string }>;
}) {
  const user = await requireAuthPage();
  const params = await searchParams;

  if (user.role === "EDUCATOR") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          La facturation n&apos;est pas accessible aux éducateurs
        </p>
      </div>
    );
  }

  const invoices = await getInvoices({
    childName: params.child || undefined,
    status: params.status || undefined,
  });

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/facturation" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Factures
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isAdmin ? "Toutes les factures" : "Mes factures"}
              </h2>
              {isAdmin && (
                <Link
                  href="/facturation/factures/nouvelle"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  + Nouvelle facture
                </Link>
              )}
            </div>

            <form method="GET" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <input
                type="text"
                name="child"
                placeholder="Nom de l'enfant..."
                defaultValue={params.child || ""}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
              <select
                name="status"
                defaultValue={params.status || ""}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="">Tous les statuts</option>
                <option value="UNPAID">Impayée</option>
                <option value="PAID">Payée</option>
                <option value="CANCELLED">Annulée</option>
              </select>
              <button
                type="submit"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Filtrer
              </button>
            </form>

            {invoices.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                Aucune facture
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">N°</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Enfant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Émise le</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Échéance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payé</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Statut</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {invoices.map((invoice) => {
                      const paid = invoice.payments.reduce(
                        (sum, p) => sum + Number(p.amount),
                        0
                      );
                      return (
                        <tr key={invoice.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            #{invoice.id}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {invoice.child.firstName} {invoice.child.lastName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(invoice.issueDate).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {invoice.dueDate
                              ? new Date(invoice.dueDate).toLocaleDateString("fr-FR")
                              : "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {Number(invoice.totalAmount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {paid.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
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
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              href={`/facturation/factures/${invoice.id}`}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                            >
                              Voir
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
