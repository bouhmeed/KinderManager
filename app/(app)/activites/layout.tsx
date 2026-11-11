import type { ReactNode } from "react";
import { requireAuthPage } from "@/lib/auth";

export const instant = false;

export default async function ActivitiesLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAuthPage();
  return <>{children}</>;
}
