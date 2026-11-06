import { getAbsenceDeclaration } from "@/app/actions/absences";
import { requireAuthPage } from "@/lib/auth";
import Link from "next/link";
import StatusButtons from "./StatusButtons";

export const instant = false;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
};

const SOURCE_LABELS: Record<string, string> = {
  PARENT: "Parent",
  STAFF: "Personnel",
};

export default async function AbsenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuthPage();
  const { id } = await params;
  const declarationId = parseInt(id);

  let declaration;
  try {
    declaration = await getAbsenceDeclaration(declarationId);
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          Déclaration non trouvée ou accès refusé
        </p>
      </div>
    );
  }

  const attendance = declaration.attendance;
  const child = attendance.child;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/absences" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Déclaration #{declaration.id}
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Enfant
                </h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {child.firstName} {child.lastName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {child.classRoom?.name || "Sans classe"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Date d&apos;absence
                </h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {new Date(attendance.date).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Statut
                </h3>
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    declaration.status === "APPROVED"
                      ? "bg-green-100 text-green-800"
                      : declaration.status === "REJECTED"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {STATUS_LABELS[declaration.status] || declaration.status}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Source
                </h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {SOURCE_LABELS[declaration.source] || declaration.source}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Déclaré par
                </h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {declaration.declaredBy.name}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Date de retour prévue
                </h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {declaration.expectedReturnDate
                    ? new Date(declaration.expectedReturnDate).toLocaleDateString(
                        "fr-FR"
                      )
                    : "-"}
                </p>
              </div>
              {declaration.reason && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Motif
                  </h3>
                  <p className="text-gray-900 dark:text-white">
                    {declaration.reason}
                  </p>
                </div>
              )}
              {declaration.description && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Description
                  </h3>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {declaration.description}
                  </p>
                </div>
              )}
            </div>

            {user.role === "ADMIN" && (
              <StatusButtons declarationId={declaration.id} status={declaration.status} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
