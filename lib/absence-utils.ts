import { prisma } from "./prisma";
import type { Prisma } from "../generated/prisma/client";

type Tx = Prisma.TransactionClient;

// Recomputes a declaration's overall status from its daily records.
// Days are the source of truth:
//   all CONFIRMED            -> APPROVED
//   all NOT_APPLICABLE       -> REJECTED
//   anything else (incl. mix)-> PENDING
export async function recomputeDeclarationStatus(
  client: Tx | typeof prisma,
  declarationId: number
): Promise<void> {
  const days = await client.absenceDeclarationDay.findMany({
    where: { declarationId },
    select: { status: true },
  });

  if (days.length === 0) {
    return;
  }

  const allConfirmed = days.every((d) => d.status === "CONFIRMED");
  const allNotApplicable = days.every((d) => d.status === "NOT_APPLICABLE");

  const status = allConfirmed
    ? "APPROVED"
    : allNotApplicable
      ? "REJECTED"
      : "PENDING";

  await client.absenceDeclaration.update({
    where: { id: declarationId },
    data: { status, reviewedAt: new Date() },
  });
}

// Returns dates (UTC midnight) within [startDate, endDate] that already have an
// active declaration day (PENDING or CONFIRMED) for the given child.
export async function findOverlappingDeclarationDates(
  childId: number,
  dates: Date[]
): Promise<Date[]> {
  if (dates.length === 0) {
    return [];
  }
  const min = dates[0];
  const max = dates[dates.length - 1];

  const days = await prisma.absenceDeclarationDay.findMany({
    where: {
      date: { gte: min, lte: max },
      status: { in: ["PENDING", "CONFIRMED"] },
      declaration: { childId },
    },
    select: { date: true },
  });

  const dateSet = new Set(dates.map((d) => d.getTime()));
  const occupied = new Set(days.map((d) => d.date.getTime()));
  return dates.filter((d) => occupied.has(d.getTime()) && dateSet.has(d.getTime()));
}

// Deletes an attendance row only when it is a safe auto-created absence record:
// status ABSENT_DECLARED, no correction history, and no declaration day left.
export async function cleanupAutoAttendance(
  tx: Tx,
  childId: number,
  date: Date
): Promise<void> {
  const attendance = await tx.attendance.findUnique({
    where: { childId_date: { childId, date } },
    include: { declarationDays: { select: { id: true } }, history: { select: { id: true } } },
  });

  if (
    attendance &&
    attendance.status === "ABSENT_DECLARED" &&
    attendance.declarationDays.length === 0 &&
    attendance.history.length === 0
  ) {
    await tx.attendance.delete({ where: { id: attendance.id } });
  }
}
