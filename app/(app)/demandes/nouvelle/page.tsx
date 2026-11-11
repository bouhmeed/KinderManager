import { getRequestableChildren } from "@/app/actions/communication";
import { requireAuthPage } from "@/lib/auth";
import RequestForm from "./RequestForm";

export const instant = false;

export default async function NewRequestPage() {
  const user = await requireAuthPage();

  if (
    user.role !== "PARENT" &&
    user.role !== "ADMIN" &&
    user.role !== "EDUCATOR"
  ) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          Action non autorisée
        </p>
      </div>
    );
  }

  const children = await getRequestableChildren();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <RequestForm childOptions={children} />
      </main>
    </div>
  );
}
