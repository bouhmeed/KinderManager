import {
  getSubscriptions,
  getParentSubscriptions,
  getPlans,
} from "@/app/actions/billing";
import { getChildren } from "@/app/actions/children";
import { requireAuthPage } from "@/lib/auth";
import SubscriptionsManager from "./SubscriptionsManager";

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
