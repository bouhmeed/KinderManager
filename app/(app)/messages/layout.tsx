import type { ReactNode } from "react";
import { requireAuthPage } from "@/lib/auth";

export const instant = false;

export default async function MessagesLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAuthPage();
  return <>{children}</>;
}
