import type { ReactNode } from "react";
import { requireAdminPage } from "@/lib/auth";

export const instant = false;

export default async function TuteursLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminPage();
  return <>{children}</>;
}
