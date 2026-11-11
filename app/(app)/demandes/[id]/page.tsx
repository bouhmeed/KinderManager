import { getRequest } from "@/app/actions/communication";
import { requireAuthPage } from "@/lib/auth";
import RequestStatusButtons from "./RequestStatusButtons";
import CancelRequestButton from "./CancelRequestButton";

export const instant = false;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
  IN_PROGRESS: "En cours de traitement",
  READY: "Prête à récupérer",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  READY: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};

const TYPE_LABELS: Record<string, string> = {
  SORTIE_ANTICIPEE: "Sortie anticipée",
  DOCUMENTS: "Documents",
  REUNION: "Réunion",
  AUTRE: "Autre",
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
      

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Type</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{TYPE_LABELS[request.type] || request.type}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Statut</h3>
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    STATUS_COLORS[request.status] ?? "bg-gray-100 text-gray-800"
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

            {(request.response || request.reviewedBy) && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Réponse de l&apos;administration
                </h3>
                {request.response && (
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {request.response}
                  </p>
                )}
                {request.reviewedBy && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Traitée par {request.reviewer?.name ?? "?"} le{" "}
                    {request.reviewedAt
                      ? new Date(request.reviewedAt).toLocaleString("fr-FR")
                      : ""}
                  </p>
                )}
              </div>
            )}

            {(user.role === "ADMIN" || user.role === "EDUCATOR") && (
              <RequestStatusButtons
                requestId={request.id}
                type={request.type}
                status={request.status}
                role={user.role}
              />
            )}

            {request.createdBy === user.id && request.status === "PENDING" && (
              <CancelRequestButton requestId={request.id} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
