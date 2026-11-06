import { getDeclarableChildren } from "@/app/actions/absences";
import { requireAuthPage } from "@/lib/auth";
import NewAbsenceForm from "./NewAbsenceForm";

export const instant = false;

export default async function NewAbsencePage() {
  const user = await requireAuthPage();
  const children = await getDeclarableChildren();

  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Aucun enfant n&apos;est lié à votre compte
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <NewAbsenceForm declarableChildren={children} userName={user.name} />;
}
