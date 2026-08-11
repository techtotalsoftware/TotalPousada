import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedSession } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import {
  getLockedDashboardNavItems,
  getVisibleDashboardNavItems,
} from "@/lib/dashboard-access";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAuthenticatedSession();

  if (!session) {
    redirect("/");
  }

  const navItems = getVisibleDashboardNavItems(
    session.plan,
    session.role,
    session.permissions,
  );

  // Mostrar "o que falta desbloquear" só faz sentido para quem decide sobre
  // o plano — evita confundir um colaborador com prompts de upgrade que ele
  // não tem como agir.
  const lockedNavItems =
    session.role === "admin" ? getLockedDashboardNavItems(session.plan) : [];

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-4 lg:flex-row lg:items-start">
        <DashboardSidebar
          tenantName={session.tenantName}
          navItems={navItems}
          lockedNavItems={lockedNavItems}
        />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center justify-end gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
          <section className="min-w-0 space-y-4">{children}</section>
        </div>
      </div>
    </main>
  );
}
