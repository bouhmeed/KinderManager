"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { logoutAction, logoutOtherSessionsAction } from "@/app/actions/auth";

type Role = "ADMIN" | "EDUCATOR" | "PARENT";

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: Record<Role, { section?: string; items: NavItem[] }[]> = {
  ADMIN: [
    {
      items: [
        { href: "/dashboard", label: "Tableau de bord" },
        { href: "/enfants", label: "Enfants" },
        { href: "/tuteurs", label: "Tuteurs" },
        { href: "/classes", label: "Classes" },
        { href: "/educateurs", label: "Éducateurs" },
      ],
    },
    {
      section: "Vie quotidienne",
      items: [
        { href: "/attendance", label: "Présences" },
        { href: "/absences", label: "Absences" },
        { href: "/demandes", label: "Demandes" },
        { href: "/planning", label: "Planning" },
        { href: "/planning/exceptions", label: "Exceptions" },
        { href: "/activites", label: "Activités" },
        { href: "/seances", label: "Séances" },
        { href: "/participation", label: "Participations" },
        { href: "/clubs", label: "Clubs" },
        { href: "/galerie", label: "Galerie" },
      ],
    },
    {
      section: "Communication & gestion",
      items: [
        { href: "/facturation", label: "Facturation" },
        { href: "/annonces", label: "Annonces" },
        { href: "/messages", label: "Messages" },
        { href: "/notifications", label: "Notifications" },
        { href: "/utilisateurs", label: "Comptes" },
      ],
    },
  ],
  EDUCATOR: [
    {
      items: [{ href: "/dashboard", label: "Tableau de bord" }],
    },
    {
      section: "Vie quotidienne",
      items: [
        { href: "/attendance", label: "Présences" },
        { href: "/absences", label: "Absences" },
        { href: "/demandes", label: "Demandes" },
        { href: "/activites", label: "Activités" },
        { href: "/seances", label: "Séances" },
        { href: "/participation", label: "Participations" },
        { href: "/galerie", label: "Galerie" },
      ],
    },
    {
      section: "Communication",
      items: [
        { href: "/annonces", label: "Annonces" },
        { href: "/messages", label: "Messages" },
        { href: "/notifications", label: "Notifications" },
      ],
    },
  ],
  PARENT: [
    {
      items: [{ href: "/dashboard", label: "Tableau de bord" }],
    },
    {
      section: "Mon enfant",
      items: [
        { href: "/attendance", label: "Présences" },
        { href: "/absences", label: "Absences" },
        { href: "/facturation", label: "Facturation" },
        { href: "/calendrier", label: "Calendrier" },
        { href: "/activites", label: "Activités" },
        { href: "/galerie", label: "Galerie" },
      ],
    },
    {
      section: "Communication",
      items: [
        { href: "/demandes", label: "Demandes" },
        { href: "/messages", label: "Messages" },
        { href: "/annonces", label: "Annonces" },
        { href: "/notifications", label: "Notifications" },
      ],
    },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  EDUCATOR: "Éducateur",
  PARENT: "Parent",
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function currentSection(pathname: string): string {
  for (const groups of Object.values(NAV_ITEMS)) {
    for (const group of groups) {
      for (const item of group.items) {
        if (isActive(pathname, item.href)) {
          return item.label;
        }
      }
    }
  }
  return "KinderManager";
}

export default function AppShell({
  user,
  unreadCount = 0,
  children,
}: {
  user: { name: string; email: string; role: string };
  unreadCount?: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = (NAV_ITEMS[user.role as Role] ? user.role : "PARENT") as Role;
  const groups = NAV_ITEMS[role];
  const section = currentSection(pathname);

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
  };

  const handleLogoutOthers = async () => {
    await logoutOtherSessionsAction();
    router.refresh();
  };

  const navContent = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {groups.map((group, gi) => (
        <div key={gi}>
          {group.section && (
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {group.section}
            </p>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-30">
        <div className="flex items-center h-16 px-5 border-b border-gray-200 dark:border-gray-700">
          <Link href="/dashboard" className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            KinderManager
          </Link>
        </div>
        {navContent}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {user.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {ROLE_LABELS[role]}
          </p>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <button
              onClick={handleLogoutOthers}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Autres appareils
            </button>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 dark:text-red-400"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-gray-800 flex flex-col shadow-xl">
            <div className="flex items-center justify-between h-16 px-5 border-b border-gray-200 dark:border-gray-700">
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                KinderManager
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 p-1"
                aria-label="Fermer le menu"
              >
                ✕
              </button>
            </div>
            {navContent}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {ROLE_LABELS[role]}
              </p>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <button
                  onClick={handleLogoutOthers}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  Autres appareils
                </button>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden text-gray-600 hover:text-gray-900 dark:text-gray-300 p-2 -ml-2"
                aria-label="Ouvrir le menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {section}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/notifications"
                className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Notifications"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {ROLE_LABELS[role]}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
