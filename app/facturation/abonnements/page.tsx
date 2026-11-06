import {
  getSubscriptions,
  getParentSubscriptions,
  getPlans,
} from "@/app/actions/billing";
import { getChildren } from "@/app/actions/children";
import { requireAuthPage } from "@/lib/auth";
import SubscriptionsManager from "./SubscriptionsManager";
import Link from "next/link";

export const instant = false;

export default async function SubscriptionsPage() {
  const user = await requireAuthPage();

  if (user.role === "EDUCATOR") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          La facturation n&apos;est pas accessible aux éducateurs
        </p>
      </div>
    );
  }

  const isAdmin = user.role === "ADMIN";
  const [subscriptions, plans, children] = await Promise.all([
    isAdmin ? getSubscriptions() : getParentSubscriptions(),
    isAdmin ? getPlans() : Promise.resolve([]),
    isAdmin ? getChildren("") : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/facturation" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Abonnements
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <SubscriptionsManager
          subscriptions={subscriptions}
          plans={plans}
          childOptions={children}
          isAdmin={isAdmin}
        />
      </main>
    </div>
  );
}
