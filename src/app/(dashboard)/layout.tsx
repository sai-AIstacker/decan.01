import { redirect } from "next/navigation";
import { canConfigureSchool, getSessionProfile, hasRole, isOwnerEmail } from "@/lib/auth/profile";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileMenuButton } from "@/components/layout/mobile-menu-button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SidebarStateSync } from "@/components/layout/sidebar-state";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId, profile } = await getSessionProfile();
  if (!userId) redirect("/login");

  const canConfigure = !!canConfigureSchool(profile?.roles);
  const isAdmin = !!hasRole(profile?.roles, "admin");
  const isOwner = isOwnerEmail(profile?.email);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SidebarStateSync />
      <Sidebar
        profile={profile}
        roles={profile?.roles || []}
        isAdmin={isAdmin}
        canConfigure={canConfigure}
        isOwner={isOwner}
      />

      {/*
        main padding syncs with sidebar width via CSS:
        - default (expanded): pl-[240px]
        - .sidebar-collapsed on <html>: pl-[60px]
        Both transitions are smooth via transition-[padding]
      */}
      <main className="sidebar-main w-full min-h-screen flex flex-col transition-[padding-left] duration-250 ease-in-out">
        <header className="flex h-[52px] border-b border-[var(--border)] frosted px-3 items-center justify-between sticky top-0 z-40 print:hidden">

          {/* Mobile: hamburger on left */}
          <MobileMenuButton />

          {/* Mobile: centered brand */}
          <div className="lg:hidden absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
            <img src="/ssvm-logo.png" alt="Decan School" className="w-6 h-6 rounded-[5px] object-contain" />
            <span className="font-semibold text-[13px] text-[var(--foreground)]">Decan School</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-0.5 ml-auto">
            <ThemeToggle />
            <Link href="/messages"
              className="flex items-center justify-center w-10 h-10 rounded-[10px] hover:bg-[var(--surface-2)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <MessageSquare size={17} />
            </Link>
            <NotificationBell userId={profile?.id} />
          </div>
        </header>

        <div className="flex-1 w-full max-w-7xl mx-auto
          px-4 py-4
          sm:px-6 sm:py-5
          lg:px-8 lg:py-8
          mobile-content lg:pb-8
          overflow-x-hidden">
          {children}
        </div>
      </main>

      <BottomNav roles={profile?.roles || []} isAdmin={isAdmin} />
    </div>
  );
}
