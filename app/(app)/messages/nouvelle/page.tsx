import {
  getMessageableUsers,
  getRequestableChildren,
} from "@/app/actions/communication";
import { requireAuthPage } from "@/lib/auth";
import NewConversationForm from "./NewConversationForm";

export const instant = false;

export default async function NewConversationPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const user = await requireAuthPage();
  const params = await searchParams;
  const childId = params.childId ? parseInt(params.childId) : undefined;

  const [users, children] = await Promise.all([
    getMessageableUsers(childId),
    user.role === "PARENT" || user.role === "EDUCATOR" || user.role === "ADMIN"
      ? getRequestableChildren()
      : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <NewConversationForm
          users={users}
          childOptions={children}
          initialChildId={childId}
        />
      </main>
    </div>
  );
}
