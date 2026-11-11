import { getAbsenceDeclarations } from "@/app/actions/absences";
import { requireAuthPage } from "@/lib/auth";
import Link from "next/link";

export const instant = false;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En cours de vérification",
  APPROVED: "Confirmée",
  REJECTED: "Non applicable",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-gray-100 text-gray-600",
};

const SOURCE_LABELS: Record<string, string> = {
  PARENT: "Parent",
  STAFF: "Personnel",
};

function formatDay(date: Date): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AbsencesPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; status?: string }>;
}) {
  const user = await requireAuthPage();
  const params = await searchParams;

  const declarations = await getAbsenceDeclarations({
    childName: params.child || undefined,
    status: params.status || undefined,
  });

  const canCreate =
    user.role === "PARENT" ||
    user.role === "ADMIN" ||
    user.role === "EDUCATOR";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user.role === "PARENT"
                  ? "Mes déclarations d'absence"
                  : "Déclarations d'absence"}
              </h2>
              {canCreate && (
                <Link
                  href="/absences/nouvelle"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  + Nouvelle déclaration
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
                <option value="PENDING">En cours de vérification</option>
                <option value="APPROVED">Confirmée</option>
                <option value="REJECTED">Non applicable</option>
              </select>
              <button
                type="submit"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Filtrer
              </button>
            </form>

            {declarations.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                Aucune déclaration d&apos;absence
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Enfant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Période
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Progression
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Motif
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Source
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {declarations.map((declaration) => {
                      const confirmed = declaration.days.filter(
                        (d) => d.status === "CONFIRMED"
                      ).length;
                      const total = declaration.days.length;
                      return (
                        <tr key={declaration.id}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {declaration.child.firstName}{" "}
                              {declaration.child.lastName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {declaration.child.classRoom?.name ||
                                "Sans classe"}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDay(declaration.startDate)}
                            {declaration.endDate.getTime() !==
                            declaration.startDate.getTime()
                              ? ` → ${formatDay(declaration.endDate)}`
                              : ""}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {confirmed}/{total} jour
                            {total > 1 ? "s" : ""} confirmé
                            {total > 1 ? "s" : ""}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                            {declaration.reason || declaration.description || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                STATUS_COLORS[declaration.status] ||
                                "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {STATUS_LABELS[declaration.status] ||
                                declaration.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {SOURCE_LABELS[declaration.source] ||
                              declaration.source}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              href={`/absences/${declaration.id}`}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
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
