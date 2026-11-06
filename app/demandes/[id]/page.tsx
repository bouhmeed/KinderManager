import { getRequest } from "@/app/actions/communication";
import { requireAuthPage } from "@/lib/auth";
import Link from "next/link";
import RequestStatusButtons from "./RequestStatusButtons";

export const instant = false;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
};

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuthPage();
  const { id } = await params;
  const requestId = parseInt(id);

  let request;
  try {
    request = await getRequest(requestId);
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          Demande non trouvée ou accès refusé
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/demandes" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Demande #{request.id}
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
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Type</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{request.type}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Statut</h3>
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    request.status === "APPROVED"
                      ? "bg-green-100 text-green-800"
                      : request.status === "REJECTED"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {STATUS_LABELS[request.status] || request.status}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Enfant</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {request.child
                    ? `${request.child.firstName} ${request.child.lastName}`
                    : "Demande générale"}
                </p>
                {request.child?.classRoom && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {request.child.classRoom.name}
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Créée par</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {request.creator.name} ({request.creator.role})
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Date</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {new Date(request.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Description
              </h3>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                {request.description}
              </p>
            </div>

            {(user.role === "ADMIN" || user.role === "EDUCATOR") && (
              <RequestStatusButtons requestId={request.id} status={request.status} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
