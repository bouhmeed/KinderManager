import { getPlans } from "@/app/actions/billing";
import { requireAdminPage } from "@/lib/auth";
import PlansManager from "./PlansManager";

export const instant = false;

export default async function PlansPage() {
  await requireAdminPage();
  const plans = await getPlans();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <PlansManager plans={plans} />
      </main>
    </div>
  );
}
