"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Users, Wallet, Settings,
  GraduationCap, UserCheck, Briefcase, ClipboardList, BarChart3
} from "lucide-react";
import type { AppRole } from "@/types/database";

type NavTab = { label: string; href: string; icon: React.ElementType; match: string[] };

function getNavTabs(roles: AppRole[], isAdmin: boolean): NavTab[] {
  if (isAdmin) return [
    { label: "Home", href: "/admin", icon: LayoutDashboard, match: ["/admin", "/dashboard"] },
    { label: "Academic", href: "/admin/classes", icon: BookOpen, match: ["/admin/classes", "/admin/subjects", "/admin/enrollments", "/admin/exams", "/admin/results", "/admin/timetable", "/admin/attendance"] },
    { label: "Finance", href: "/accounting", icon: Wallet, match: ["/accounting"] },
    { label: "HR", href: "/hr", icon: Users, match: ["/hr"] },
    { label: "Settings", href: "/admin/users", icon: Settings, match: ["/admin/users", "/config", "/admin/settings"] },
  ];
  if (roles.includes("teacher")) return [
    { label: "Home", href: "/teacher", icon: LayoutDashboard, match: ["/teacher"] },
    { label: "Classes", href: "/teacher/my-classes", icon: BookOpen, match: ["/teacher/my-classes"] },
    { label: "Grades", href: "/teacher/marks", icon: BarChart3, match: ["/teacher/marks"] },
    { label: "Tasks", href: "/teacher/assignments", icon: ClipboardList, match: ["/teacher/assignments", "/teacher/lesson-plans"] },
    { label: "Students", href: "/teacher/students", icon: Users, match: ["/teacher/students"] },
  ];
  if (roles.includes("student")) return [
    { label: "Home", href: "/student", icon: LayoutDashboard, match: ["/student"] },
    { label: "Schedule", href: "/student/timetable", icon: BookOpen, match: ["/student/timetable"] },
    { label: "Results", href: "/student/results", icon: GraduationCap, match: ["/student/results"] },
    { label: "Attendance", href: "/student/attendance", icon: UserCheck, match: ["/student/attendance"] },
  ];
  if (roles.includes("parent")) return [
    { label: "Home", href: "/parent", icon: LayoutDashboard, match: ["/parent"] },
    { label: "Attendance", href: "/parent/attendance", icon: UserCheck, match: ["/parent/attendance"] },
    { label: "Results", href: "/parent/results", icon: GraduationCap, match: ["/parent/results"] },
    { label: "Schedule", href: "/parent/timetable", icon: BookOpen, match: ["/parent/timetable"] },
  ];
  if (roles.includes("accounting")) return [
    { label: "Home", href: "/accounting", icon: Wallet, match: ["/accounting"] },
    { label: "Fees", href: "/accounting/fee-management", icon: Briefcase, match: ["/accounting/fee-management"] },
    { label: "Reports", href: "/accounting/advanced-reports", icon: BarChart3, match: ["/accounting/advanced-reports"] },
  ];
  if (roles.includes("hr")) return [
    { label: "Home", href: "/hr", icon: LayoutDashboard, match: ["/hr"] },
    { label: "Staff", href: "/hr/staff", icon: Users, match: ["/hr/staff"] },
    { label: "Leave", href: "/hr/leave", icon: ClipboardList, match: ["/hr/leave"] },
    { label: "Payroll", href: "/hr/payroll", icon: Briefcase, match: ["/hr/payroll"] },
  ];
  return [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard, match: ["/dashboard"] },
  ];
}

const TabLink = React.memo(function TabLink({ tab, active }: { tab: NavTab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-xl transition-all duration-150 press-scale
        ${active
          ? "text-[var(--foreground)]"
          : "text-[var(--muted-foreground)]"
        }`}
    >
      <div className={`w-10 h-7 flex items-center justify-center rounded-xl transition-all duration-150 ${active ? "bg-[var(--surface-2)]" : ""}`}>
        <Icon size={active ? 20 : 19} strokeWidth={active ? 2.2 : 1.8} />
      </div>
      <span className={`text-[10px] font-medium transition-all ${active ? "font-semibold" : ""}`}>{tab.label}</span>
    </Link>
  );
});

export const BottomNav = React.memo(function BottomNav({ roles, isAdmin }: { roles: AppRole[]; isAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = useMemo(() => getNavTabs(roles, isAdmin), [roles, isAdmin]);

  return (
    <nav className="bottom-nav print:hidden">
      {tabs.map(tab => {
        const active = tab.match.some(m => pathname === m || pathname.startsWith(m + "/"));
        return <TabLink key={tab.href} tab={tab} active={active} />;
      })}
    </nav>
  );
});
