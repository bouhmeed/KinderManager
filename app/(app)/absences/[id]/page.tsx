import { getAbsenceDeclaration } from "@/app/actions/absences";
import { requireAuthPage } from "@/lib/auth";
import DeclarationActions from "./DeclarationActions";

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

const DAY_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  NOT_APPLICABLE: "Non applicable",
};

const DAY_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-green-100 text-green-800",
  NOT_APPLICABLE: "bg-gray-100 text-gray-600",
};

const ATTENDANCE_LABELS: Record<string, string> = {
  NOT_RECORDED: "À vérifier",
  PRESENT: "Présent",
  ABSENT_DECLARED: "Absent (déclaré)",
  ABSENT_EXCUSED: "Absent excusé",
  ABSENT_UNEXCUSED: "Absent non excusé",
  LATE: "En retard",
};

function formatDay(date: Date): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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

  const child = declaration.child;
  const canVerify = user.role === "ADMIN" || user.role === "EDUCATOR";
  const isCreator = declaration.declaredByUserId === user.id;
  const hasPendingDays = declaration.days.some((d) => d.status === "PENDING");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
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
                  Période d&apos;absence
                </h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {formatDay(declaration.startDate)}
                  {declaration.endDate.getTime() !==
                  declaration.startDate.getTime()
                    ? ` → ${formatDay(declaration.endDate)}`
                    : ""}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Statut global
                </h3>
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    STATUS_COLORS[declaration.status] ||
                    "bg-gray-100 text-gray-600"
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
              {declaration.reviewer && declaration.reviewedAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Dernière vérification
                  </h3>
                  <p className="text-gray-900 dark:text-white">
                    {declaration.reviewer.name} —{" "}
                    {new Date(declaration.reviewedAt).toLocaleString("fr-FR")}
                  </p>
                </div>
              )}
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
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Détail par jour ({declaration.days.length} jour
              {declaration.days.length > 1 ? "s" : ""})
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Présence
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Statut du jour
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Vérifié par
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {declaration.days.map((day) => (
                    <tr key={day.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatDay(day.date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {ATTENDANCE_LABELS[day.attendance.status] ||
                          day.attendance.status}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            DAY_STATUS_COLORS[day.status] ||
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {DAY_STATUS_LABELS[day.status] || day.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {day.verifier?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                        {day.note || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {(canVerify || isCreator) && (
            <DeclarationActions
              declarationId={declaration.id}
              canVerify={canVerify}
              isCreator={isCreator}
              hasPendingDays={hasPendingDays}
              days={declaration.days.map((d) => ({
                id: d.id,
                date: d.date.toISOString(),
                status: d.status,
              }))}
            />
          )}
        </div>
      </main>
    </div>
  );
}
