import { getPendingEnrollments } from "@/app/actions/clubs";
import { requireAuthPage } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClubsManager from "./ClubsManager";

export const instant = false;

export default async function ClubsPage() {
  const user = await requireAuthPage();
  if (user.role !== "ADMIN") redirect("/dashboard");
  const pending = await getPendingEnrollments();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <ClubsManager pending={pending} />
        </div>
      </main>
    </div>
  );
}
