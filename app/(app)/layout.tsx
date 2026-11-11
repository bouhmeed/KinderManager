import type { ReactNode } from "react";
import { requireAuthPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";

export const instant = false;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireAuthPage();

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, status: "UNREAD" },
  });

  return (
    <AppShell
      user={{ name: user.name, email: user.email, role: user.role }}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  );
}
