import { Suspense } from "react";
import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { UserAvatarServer } from "@/components/ui/user-avatar";
import {
  Users, GraduationCap, Building2, Calendar, Target,
  Wallet, AlertTriangle, BarChart3, Clock, FileText,
  UserCheck, Settings, Activity, CheckCircle2, TrendingUp,
  BookOpen, ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { KPICard } from "@/components/ui/dashboard-kpi-card";
import { KPICarousel } from "@/components/ui/kpi-carousel";
import { SectionHeader } from "@/components/ui/section-header";
import { AdminChartsClient } from "./ui/admin-charts-client";

const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const quickLinks = [
  { href: "/admin/academic-years", label: "Academic Years", icon: Calendar },
  { href: "/admin/classes",        label: "Classes",        icon: Building2 },
  { href: "/admin/enrollments",    label: "Enrollments",    icon: UserCheck },
  { href: "/admin/exams",          label: "Exams",          icon: FileText },
  { href: "/admin/results",        label: "Results",        icon: BarChart3 },
  { href: "/admin/attendance",     label: "Attendance",     icon: Clock },
  { href: "/accounting",           label: "Finance",        icon: Wallet },
  { href: "/hr",                   label: "HR",             icon: Users },
  { href: "/admin/users",          label: "Users",          icon: GraduationCap },
  { href: "/admin/settings",       label: "Settings",       icon: Settings },
];

const actionStyle: Record<string, { dot: string; label: string; bg: string; text: string }> = {
  INSERT: { dot: "bg-[#34c759]", label: "INSERT", bg: "bg-[#34c759]/10", text: "text-[#34c759]" },
  UPDATE: { dot: "bg-[#007aff]", label: "UPDATE", bg: "bg-[#007aff]/10", text: "text-[#007aff]" },
  DELETE: { dot: "bg-[#ff3b30]", label: "DELETE", bg: "bg-[#ff3b30]/10", text: "text-[#ff3b30]" },
};

function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="apple-card overflow-hidden animate-pulse">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="h-4 w-32 rounded-lg bg-[var(--surface-2)]" />
      </div>
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: rows }).map((_, j) => (
          <div key={j} className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 rounded-full bg-[var(--surface-2)]" />
              <div className="h-2.5 w-20 rounded-full bg-[var(--surface-2)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Streamed: Charts + Calendar ──
async function AdminCharts() {
  const db = createServiceClient();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [attResult, statsResult, examsResult, enrollResult] = await Promise.all([
    db.from("attendance").select("date,status").gte("date", sixMonthsAgo.toISOString().split("T")[0]),
    db.rpc("get_admin_dashboard_stats"),
    db.from("exams").select("start_date,name,classes(name)").gte("start_date", new Date().toISOString().split("T")[0]).limit(10),
    db.from("enrollments").select("created_at").gte("created_at", sixMonthsAgo.toISOString()),
  ]);

  // Monthly attendance trend
  const byMonth: Record<string, { total: number; present: number }> = {};
  for (const r of (attResult.data || [])) {
    const m = (r.date as string).slice(0, 7);
    if (!byMonth[m]) byMonth[m] = { total: 0, present: 0 };
    byMonth[m].total++;
    if (r.status === "present" || r.status === "late") byMonth[m].present++;
  }
  const attendanceTrend = Object.entries(byMonth).sort(([a],[b]) => a.localeCompare(b)).map(([m, v]) => ({
    name: new Date(m + "-01").toLocaleString("en", { month: "short" }),
    Attendance: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
  }));

  // Monthly enrollment trend
  const byEnrollMonth: Record<string, number> = {};
  for (const r of (enrollResult.data || [])) {
    const m = (r.created_at as string).slice(0, 7);
    byEnrollMonth[m] = (byEnrollMonth[m] || 0) + 1;
  }
  const enrollTrend = Object.entries(byEnrollMonth).sort(([a],[b]) => a.localeCompare(b)).map(([m, v]) => ({
    name: new Date(m + "-01").toLocaleString("en", { month: "short" }),
    Enrollments: v,
  }));

  const stats = (statsResult.data as Record<string, any>) || {};

  // Calendar events from upcoming exams
  const calendarEvents = (examsResult.data || []).map((e: any) => ({
    date: e.start_date,
    label: e.name,
    color: "blue" as const,
  }));

  return (
    <AdminChartsClient
      attendanceTrend={attendanceTrend}
      enrollTrend={enrollTrend}
      calendarEvents={calendarEvents}
      feeStats={{ paid: stats.paid_count ?? 0, pending: stats.pending_count ?? 0 }}
    />
  );
}

// ── Streamed: Activity + Enrollments ──
async function AdminActivity() {
  const db = createServiceClient();
  const [auditRes, enrollRes] = await Promise.all([
    db.from("audit_logs").select("action,table_name,created_at").order("created_at", { ascending: false }).limit(8),
    db.from("enrollments").select("created_at,student_id,profiles:student_id(full_name),classes(name,section)").order("created_at", { ascending: false }).limit(5),
  ]);

  const recentAudit  = (auditRes.data  || []) as any[];
  const recentEnroll = (enrollRes.data || []) as any[];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* System Activity */}
      <div className="apple-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <SectionHeader title="System Activity" icon={Activity} href="/admin/audit-logs" hrefLabel="Full log" />
        </div>
        {recentAudit.length === 0
          ? <div className="p-8 text-center text-[13px] text-[var(--muted-foreground)]">No activity yet</div>
          : (
            <div className="px-4 py-2 space-y-1">
              {recentAudit.map((log: any, i: number) => {
                const s = actionStyle[log.action] || { dot: "bg-[var(--muted-foreground)]", label: log.action, bg: "bg-[var(--surface-2)]", text: "text-[var(--muted-foreground)]" };
                return (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[6px] shrink-0 ${s.bg} ${s.text}`}>{s.label}</span>
                    <p className="text-[12px] text-[var(--foreground)] flex-1 truncate capitalize font-medium">{log.table_name?.replace(/_/g, " ")}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)] shrink-0 mono-num">{new Date(log.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {/* Recent Enrollments */}
      <div className="apple-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <SectionHeader title="Recent Enrollments" icon={CheckCircle2} href="/admin/enrollments" hrefLabel="Manage" />
        </div>
        {recentEnroll.length === 0
          ? <div className="p-8 text-center text-[13px] text-[var(--muted-foreground)]">No enrollments yet</div>
          : (
            <div className="divide-y divide-[var(--border)]">
              {recentEnroll.map((e: any, i: number) => {
                const student = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
                const cls     = Array.isArray(e.classes)  ? e.classes[0]  : e.classes;
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors">
                    <UserAvatarServer userId={e.student_id || String(i)} name={student?.full_name} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--foreground)] truncate">{student?.full_name || "—"}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)]">{cls?.name} {cls?.section}</p>
                    </div>
                    <span className="text-[10px] text-[var(--muted-foreground)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full shrink-0 mono-num">
                      {new Date(e.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const { profile } = await getSessionProfile();
  if (!profile || !hasRole(profile.roles, "admin")) redirect("/dashboard");

  const supabase = await createClient();
  const [statsResult, todayPctResult] = await Promise.all([
    supabase.rpc("get_admin_dashboard_stats"),
    supabase.rpc("get_today_attendance_pct"),
  ]);

  const stats    = (statsResult.data as Record<string, any>) || {};
  const todayPct = Math.round((todayPctResult.data as number) ?? 0);
  const kpis = {
    students: stats.student_count ?? 0,
    teachers: stats.teacher_count ?? 0,
    classes:  stats.class_count   ?? 0,
    feesCollected: stats.fees_collected ?? 0,
    pendingDues:   stats.pending_dues   ?? 0,
    passRate:      stats.pass_rate      ?? 0,
    totalExams:    stats.total_exams    ?? 0,
    todayAttendancePct: todayPct,
    academicYear: stats.active_year ?? "N/A",
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5 fade-up">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-xs mb-0.5">Admin Dashboard</p>
          <h1 className="text-[22px] lg:text-[26px] font-black tracking-tight text-[var(--foreground)] leading-tight" style={{ fontFamily: "var(--font-jakarta)" }}>
            {greeting}, {profile.full_name?.split(" ")[0]} 👋
          </h1>
          <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5">
            {kpis.academicYear} · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="apple-card px-4 py-2.5 text-center">
            <p className="label-xs mb-0.5">Today's Attendance</p>
            <p className={`text-[18px] font-black mono-num ${todayPct >= 75 ? "text-[#34c759]" : "text-[#ff3b30]"}`}>{todayPct}%</p>
          </div>
          <div className="apple-card px-4 py-2.5 text-center">
            <p className="label-xs mb-0.5">Pass Rate</p>
            <p className="text-[18px] font-black mono-num text-[var(--foreground)]">{kpis.passRate}%</p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <KPICarousel cols={6}>
        <KPICard title="Students"       value={kpis.students}              icon={Users}         color="blue"   trend={{ value: 4, isPositive: true }} />
        <KPICard title="Teachers"       value={kpis.teachers}              icon={GraduationCap} color="purple" trend={{ value: 2, isPositive: true }} />
        <KPICard title="Classes"        value={kpis.classes}               icon={Building2}     color="teal"   description="Active" />
        <KPICard title="Fees Collected" value={fmt(kpis.feesCollected)}    icon={Wallet}        color="green"  trend={{ value: 8, isPositive: true }} />
        <KPICard title="Pending Dues"   value={fmt(kpis.pendingDues)}      icon={AlertTriangle} color="red"    trend={{ value: 3, isPositive: false }} />
        <KPICard title="Exams"          value={kpis.totalExams}            icon={FileText}      color="amber"  description="Total" />
      </KPICarousel>

      {/* ── Charts + Calendar (streamed) ── */}
      <Suspense fallback={
        <div className="grid gap-4 lg:grid-cols-3">
          {[1,2,3].map(i => (
            <div key={i} className="apple-card p-5 animate-pulse">
              <div className="h-4 w-28 rounded-lg bg-[var(--surface-2)] mb-4" />
              <div className="h-48 rounded-xl bg-[var(--surface-2)]" />
            </div>
          ))}
        </div>
      }>
        <AdminCharts />
      </Suspense>

      {/* ── Activity + Enrollments (streamed) ── */}
      <Suspense fallback={<div className="grid gap-4 lg:grid-cols-2"><Skeleton /><Skeleton /></div>}>
        <AdminActivity />
      </Suspense>

      {/* ── Quick Access ── */}
      <div>
        <p className="label-xs mb-3">Quick Access</p>
        <div className="grid grid-cols-5 lg:grid-cols-10 gap-2">
          {quickLinks.map(link => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}
                className="apple-card flex flex-col items-center gap-1.5 p-2.5 lg:p-3 hover:bg-[var(--surface-2)] transition-colors group press-scale">
                <div className="w-9 h-9 lg:w-8 lg:h-8 rounded-[10px] bg-[var(--surface-2)] flex items-center justify-center group-hover:bg-[#1d1d1f] transition-colors">
                  <Icon size={15} className="text-[var(--foreground)] group-hover:text-white transition-colors" />
                </div>
                <p className="text-[9px] lg:text-[10px] font-semibold text-[var(--muted-foreground)] text-center leading-tight">{link.label}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
