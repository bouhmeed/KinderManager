import { getOccurrence } from "@/app/actions/activities";
import { requireAuthPage } from "@/lib/auth";
import { todayTunis, dayKeyTunis } from "@/lib/dates";
import { notFound } from "next/navigation";
import Link from "next/link";
import OccurrenceDetail from "./OccurrenceDetail";

export const instant = false;

export default async function OccurrencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuthPage();
  let occurrence;
  try {
    occurrence = await getOccurrence(parseInt(id));
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div className="flex justify-between items-center">
            <Link href="/seances" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400">
              ← Séances
            </Link>
          </div>
          <OccurrenceDetail
            occurrence={{
              ...occurrence,
              isPast: occurrence.date.toISOString().slice(0, 10) < dayKeyTunis(todayTunis()),
            }}
          />
        </div>
      </main>
    </div>
  );
}
