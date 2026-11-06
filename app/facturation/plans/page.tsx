import { getPlans } from "@/app/actions/billing";
import { requireAdminPage } from "@/lib/auth";
import PlansManager from "./PlansManager";
import Link from "next/link";

export const instant = false;

export default async function PlansPage() {
  await requireAdminPage();
  const plans = await getPlans();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/facturation" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Plans d&apos;abonnement
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <PlansManager plans={plans} />
      </main>
    </div>
  );
}
