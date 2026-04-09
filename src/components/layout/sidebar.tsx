"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, BookOpen, Settings, Briefcase, GraduationCap,
  LogOut, X, Building, UserCheck, CalendarDays, Library, BookMarked,
  UserPlus, Clock, Calendar, FileText, PenTool, BarChart3, ArrowDownRight,
  Wallet, CreditCard, Layers, Scale, TrendingUp, TrendingDown, Building2,
  Target, Wrench, ShieldCheck, LineChart, Star, CalendarX, Megaphone,
  ClipboardList, ChevronLeft, ChevronRight
} from "lucide-react";
import type { AppRole } from "@/types/database";
import { ROLE_LABELS } from "@/types/database";
import { signOut } from "@/app/actions/auth";
import { UserAvatar } from "@/components/ui/user-avatar";

type NavItem = { name: string; href: string; icon: React.ElementType; show: boolean; group: string; };

const groupLabels: Record<string, string> = {
  main: "", academic: "Academic", departments: "Departments",
  accounting: "Finance", hr: "Human Resources", teacher: "Teaching",
  student: "Student", parent: "Parent", system: "System",
};

// Memoized NavLink — prevents re-render when sibling items change
const NavLink = React.memo(function NavLink({
  item, collapsed, active
}: {
  item: NavItem; collapsed: boolean; active: boolean;
}) {
  return (
    <Link href={item.href} title={collapsed ? item.name : undefined}
      className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-[13px] font-medium transition-all duration-150 group
        ${active
          ? "bg-[var(--surface-2)] text-[var(--foreground)] font-semibold"
          : "text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        }`}>
      {active && <span className="nav-active-dot" />}
      <item.icon size={15} className={`shrink-0 transition-transform duration-150 ${active ? "text-[var(--foreground)]" : "group-hover:scale-105"}`} />
      {!collapsed && <span className="truncate">{item.name}</span>}
    </Link>
  );
});

export function Sidebar({ profile, roles, isAdmin, canConfigure, isOwner }:
  { profile: any; roles: AppRole[]; isAdmin: boolean; canConfigure: boolean; isOwner: boolean; }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Emit collapse state changes so layout can adjust padding
  const handleCollapse = useCallback((val: boolean) => {
    setCollapsed(val);
    window.dispatchEvent(new CustomEvent("sidebar-collapse-change", { detail: { collapsed: val } }));
  }, []);

  // Use matchMedia instead of resize event — fires only on threshold crossing
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const handler = () => setIsOpen(prev => !prev);
    window.addEventListener("toggle-sidebar", handler);
    return () => window.removeEventListener("toggle-sidebar", handler);
  }, []);

  useEffect(() => {
    if (isMobile) {
      const t = setTimeout(() => {
        setIsOpen(false);
        window.dispatchEvent(new CustomEvent("sidebar-closed"));
      }, 0);
      return () => clearTimeout(t);
    }
  }, [pathname, isMobile]);

  const isStudentOnly = roles.includes("student");
  const isOnAccounting = pathname.startsWith("/accounting");

  // Memoize nav items — only recompute when pathname or role-related props change
  const allNav = useMemo<NavItem[]>(() => [
    { name: "Dashboard", href: isStudentOnly ? "/student" : "/dashboard", icon: LayoutDashboard, show: !isOnAccounting, group: "main" },
    ...(isOnAccounting ? [
      { name: "Overview", href: "/accounting", icon: Wallet, show: true, group: "accounting" },
      { name: "Chart of Accounts", href: "/accounting/chart-of-accounts", icon: Layers, show: true, group: "accounting" },
      { name: "Financial Statements", href: "/accounting/financial-statements", icon: Scale, show: true, group: "accounting" },
      { name: "Receivables", href: "/accounting/receivables", icon: TrendingUp, show: true, group: "accounting" },
      { name: "Payables", href: "/accounting/payables", icon: TrendingDown, show: true, group: "accounting" },
      { name: "Bank & Cash", href: "/accounting/bank", icon: Building2, show: true, group: "accounting" },
      { name: "Budgets", href: "/accounting/budgets", icon: Target, show: true, group: "accounting" },
      { name: "Journals", href: "/accounting/journals", icon: BookOpen, show: true, group: "accounting" },
      { name: "Ledger", href: "/accounting/ledger", icon: FileText, show: true, group: "accounting" },
      { name: "Expenses", href: "/accounting/expenses", icon: ArrowDownRight, show: true, group: "accounting" },
      { name: "Fixed Assets", href: "/accounting/fixed-assets", icon: Wrench, show: true, group: "accounting" },
      { name: "Cost Centers", href: "/accounting/cost-centers", icon: Layers, show: true, group: "accounting" },
      { name: "Fee Management", href: "/accounting/fee-management", icon: Users, show: true, group: "accounting" },
      { name: "Collect Payment", href: "/accounting/collect-payment", icon: CreditCard, show: true, group: "accounting" },
      { name: "Audit Trail", href: "/accounting/audit-trail", icon: ShieldCheck, show: true, group: "accounting" },
      { name: "Advanced Reports", href: "/accounting/advanced-reports", icon: LineChart, show: true, group: "accounting" },
    ] : []),
    { name: "Academic Years", href: "/admin/academic-years", icon: CalendarDays, show: isAdmin || roles.includes("app_config"), group: "academic" },
    { name: "Classes", href: "/admin/classes", icon: Library, show: isAdmin || roles.includes("app_config"), group: "academic" },
    { name: "Subjects", href: "/admin/subjects", icon: BookMarked, show: isAdmin || roles.includes("app_config"), group: "academic" },
    { name: "Class Subjects", href: "/admin/class-subjects", icon: BookOpen, show: isAdmin || roles.includes("app_config"), group: "academic" },
    { name: "Enrollments", href: "/admin/enrollments", icon: UserPlus, show: isAdmin || roles.includes("app_config"), group: "academic" },
    { name: "Attendance", href: "/admin/attendance", icon: Clock, show: isAdmin || roles.includes("app_config"), group: "academic" },
    { name: "Timetable", href: "/admin/timetable", icon: Calendar, show: isAdmin || roles.includes("app_config"), group: "academic" },
    { name: "Exams", href: "/admin/exams", icon: FileText, show: isAdmin || roles.includes("app_config"), group: "academic" },
    { name: "Results", href: "/admin/results", icon: BarChart3, show: isAdmin || roles.includes("app_config"), group: "academic" },
    { name: "Accounting", href: "/accounting", icon: Building, show: (isAdmin || roles.includes("accounting")) && !isOnAccounting, group: "departments" },
    { name: "Human Resources", href: "/hr", icon: UserCheck, show: isAdmin || roles.includes("hr"), group: "departments" },
    { name: "Staff Directory", href: "/hr/staff", icon: Users, show: isAdmin || roles.includes("hr"), group: "hr" },
    { name: "Leave Management", href: "/hr/leave", icon: CalendarX, show: isAdmin || roles.includes("hr"), group: "hr" },
    { name: "Payroll", href: "/hr/payroll", icon: Briefcase, show: isAdmin || roles.includes("hr"), group: "hr" },
    { name: "Staff Attendance", href: "/hr/attendance", icon: UserCheck, show: isAdmin || roles.includes("hr"), group: "hr" },
    { name: "Performance", href: "/hr/performance", icon: Star, show: isAdmin || roles.includes("hr"), group: "hr" },
    { name: "Departments", href: "/hr/departments", icon: Building2, show: isAdmin || roles.includes("hr"), group: "hr" },
    { name: "HR Announcements", href: "/hr/announcements", icon: Megaphone, show: isAdmin || roles.includes("hr"), group: "hr" },
    { name: "Teacher Portal", href: "/teacher", icon: Briefcase, show: roles.includes("teacher"), group: "teacher" },
    { name: "My Classes", href: "/teacher/my-classes", icon: BookOpen, show: roles.includes("teacher"), group: "teacher" },
    { name: "My Students", href: "/teacher/students", icon: Users, show: roles.includes("teacher"), group: "teacher" },
    { name: "Attendance", href: "/teacher/attendance", icon: Clock, show: roles.includes("teacher"), group: "teacher" },
    { name: "Gradebook", href: "/teacher/marks", icon: PenTool, show: roles.includes("teacher"), group: "teacher" },
    { name: "Assignments", href: "/teacher/assignments", icon: ClipboardList, show: roles.includes("teacher"), group: "teacher" },
    { name: "Lesson Plans", href: "/teacher/lesson-plans", icon: FileText, show: roles.includes("teacher"), group: "teacher" },
    { name: "Notices", href: "/teacher/notices", icon: Megaphone, show: roles.includes("teacher"), group: "teacher" },
    { name: "My Schedule", href: "/teacher/timetable", icon: Calendar, show: roles.includes("teacher"), group: "teacher" },
    { name: "My Attendance", href: "/student/attendance", icon: Clock, show: roles.includes("student"), group: "student" },
    { name: "Class Schedule", href: "/student/timetable", icon: Calendar, show: roles.includes("student"), group: "student" },
    { name: "Report Card", href: "/student/results", icon: GraduationCap, show: roles.includes("student"), group: "student" },
    { name: "Parent Portal", href: "/parent", icon: Users, show: roles.includes("parent"), group: "parent" },
    { name: "Child Attendance", href: "/parent/attendance", icon: Clock, show: roles.includes("parent"), group: "parent" },
    { name: "Child Schedule", href: "/parent/timetable", icon: Calendar, show: roles.includes("parent"), group: "parent" },
    { name: "Child Results", href: "/parent/results", icon: FileText, show: roles.includes("parent"), group: "parent" },
    { name: "User Management", href: "/admin/users", icon: Users, show: isAdmin, group: "system" },
    { name: "Global Config", href: "/config", icon: Settings, show: isAdmin || roles.includes("app_config"), group: "system" },
    { name: "Owner Console", href: "/owner", icon: Settings, show: isOwner, group: "system" },
  ].filter(i => i.show), [isOnAccounting, isStudentOnly, isAdmin, isOwner, roles]);

  // Memoize grouped structure
  const grouped = useMemo(() => {
    const result: Record<string, NavItem[]> = {};
    for (const item of allNav) {
      if (!result[item.group]) result[item.group] = [];
      result[item.group].push(item);
    }
    return result;
  }, [allNav]);

  // Determine active state for each item
  const activeHref = useMemo(() => {
    for (const item of allNav) {
      const hasChild = allNav.some(o => o.href !== item.href && o.href.startsWith(`${item.href}/`));
      if (item.name === "Overview" && pathname === "/accounting") return item.href;
      const isActive = hasChild ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (isActive) return item.href;
    }
    return "";
  }, [allNav, pathname]);

  const roleLabel = useMemo(() => roles.map(r => ROLE_LABELS[r]).join(", "), [roles]);
  const w = collapsed ? "w-[60px]" : "w-[240px]";

  const handleClose = useCallback(() => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent("sidebar-closed"));
  }, []);

  return (
    <>
      {isOpen && isMobile && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden print:hidden" onClick={handleClose} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 ${w} flex flex-col
        frosted border-r border-[var(--border)]
        transition-all duration-250 ease-in-out
        lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}
        print:hidden
        bottom-0 lg:bottom-0`}
        style={{ bottom: isMobile ? 'calc(var(--bottom-nav-h) + var(--safe-bottom))' : 0 }}>

        {/* Brand */}
        <div className={`h-12 flex items-center shrink-0 border-b border-[var(--border)] ${collapsed ? "justify-center px-2" : "px-4 justify-between"}`}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img src="/ssvm-logo.png" alt="Decan School" className="w-7 h-7 rounded-[6px] object-contain" />
              <span className="text-[13px] font-semibold tracking-tight text-[var(--foreground)]">Decan School</span>
            </div>
          )}
          {collapsed && (
            <img src="/ssvm-logo.png" alt="Decan School" className="w-7 h-7 rounded-[6px] object-contain" />
          )}
          {/* Desktop: collapse toggle */}
          {!isMobile && (
            <button onClick={() => handleCollapse(!collapsed)}
              className="p-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors">
              {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>
          )}
          {/* Mobile: close button */}
          {isMobile && (
            <button onClick={handleClose}
              className="p-1.5 rounded-[8px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* User */}
        {!collapsed && (
          <div className="px-3 py-2.5 border-b border-[var(--border)] shrink-0">
            <div className="flex items-center gap-2.5">
              <UserAvatar userId={profile?.id || "default"} name={profile?.full_name} size={28} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[var(--foreground)] truncate">{profile?.full_name || "User"}</p>
                <p className="text-[10px] text-[var(--muted-foreground)] truncate">{roleLabel}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className={collapsed ? "px-1.5 mb-0.5" : "px-2 mb-0.5"}>
              {!collapsed && groupLabels[group] && (
                <p className="label-xs px-2.5 pt-3 pb-1">{groupLabels[group]}</p>
              )}
              {collapsed && groupLabels[group] && (
                <div className="my-1.5 mx-1 border-t border-[var(--border)]" />
              )}
              <div className="space-y-px">
                {items.map(item => (
                  <NavLink
                    key={item.href + item.name}
                    item={item}
                    collapsed={collapsed}
                    active={item.href === activeHref}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <div className="shrink-0 border-t border-[var(--border)] p-2">
          <form action={signOut}>
            <button type="submit" title={collapsed ? "Sign Out" : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-3 rounded-[10px] text-[13px] font-medium text-[var(--muted-foreground)] hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all min-h-[48px] ${collapsed ? "justify-center" : ""}`}>
              <LogOut size={16} className="shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
