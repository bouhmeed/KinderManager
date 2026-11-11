import { getActivity } from "@/app/actions/activities";
import { getEnrollmentsForActivity } from "@/app/actions/clubs";
import { ENROLLMENT_STATUS_LABELS } from "@/lib/schedule-constants";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/schedule-constants";
import { requireAuthPage } from "@/lib/auth";
import { getParentChildIds } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import ScheduleManager from "./ScheduleManager";
import ClubRequestPanel from "./ClubRequestPanel";

export const instant = false;

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAuthPage();
  let activity;
  try {
    activity = await getActivity(parseInt(id));
  } catch {
    notFound();
  }
  const isAdmin = user.role === "ADMIN";

  let enrollments: Awaited<ReturnType<typeof getEnrollmentsForActivity>> = [];
  if (activity.category === "CLUB" && (isAdmin || user.role === "EDUCATOR")) {
    enrollments = await getEnrollmentsForActivity(activity.id);
  }

  let parentChildren: { id: number; firstName: string; lastName: string }[] = [];
  if (user.role === "PARENT" && activity.category === "CLUB") {
    const ids = await getParentChildIds(user.id);
    parentChildren = await prisma.child.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activity.title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {ACTIVITY_CATEGORY_LABELS[activity.category as keyof typeof ACTIVITY_CATEGORY_LABELS] ?? activity.category}
                  {" — "}
                  {activity.isActive ? "Active" : "Inactive"}
                  {activity.description ? ` — ${activity.description}` : ""}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Link href="/activites" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400">
                  ← Activités
                </Link>
                {isAdmin && (
                  <Link
                    href={`/activites/${activity.id}/modifier`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Modifier
                  </Link>
                )}
              </div>
            </div>
          </div>

          {enrollments.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Inscriptions ({enrollments.length})
              </h3>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {enrollments.map((e) => (
                  <li key={e.id} className="py-2 flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {e.child.firstName} {e.child.lastName}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">{e.child.classRoom?.name ?? "—"}</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      e.status === "APPROVED" ? "bg-green-100 text-green-800"
                      : e.status === "PENDING" ? "bg-amber-100 text-amber-800"
                      : e.status === "REJECTED" ? "bg-red-100 text-red-700"
                      : "bg-gray-200 text-gray-600"
                    }`}>
                      {ENROLLMENT_STATUS_LABELS[e.status]}
                    </span>
                    {e.decisionNote && <span className="text-xs text-gray-500">{e.decisionNote}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parentChildren.length > 0 && (
            <ClubRequestPanel activityId={activity.id} childOptions={parentChildren} />
          )}

          <ScheduleManager
            activityId={activity.id}
            schedules={activity.schedules.map((s) => ({
              id: s.id,
              classRoomId: s.classRoomId,
              classRoomName: s.classRoom?.name ?? null,
              weekday: s.weekday,
              startMinutes: s.startMinutes,
              endMinutes: s.endMinutes,
              validFrom: s.validFrom.toISOString(),
              validTo: s.validTo?.toISOString() ?? null,
              educatorId: s.educatorId,
              educatorName: s.educator?.user.name ?? null,
              isCancelled: s.isCancelled,
            }))}
            isAdmin={isAdmin}
          />
        </div>
      </main>
    </div>
  );
}
