import { requireAuthPage } from "@/lib/auth";
import CalendarClient from "./CalendarClient";

export const instant = false;

export default async function CalendarPage() {
  await requireAuthPage();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <CalendarClient />
        </div>
      </main>
    </div>
  );
}
