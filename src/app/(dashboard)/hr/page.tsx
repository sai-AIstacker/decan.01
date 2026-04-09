import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Users, Clock, CalendarX, Briefcase, Star,
  UserCheck, Megaphone, ArrowUpRight, BarChart3, Building2,
  CheckCircle2, XCircle, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { LazyBarChart as BarChartWidget, LazyPieChart as PieChartWidget } from "@/components/ui/lazy-charts";
import { KPICard } from "@/components/ui/dashboard-kpi-card";
import { KPICarousel } from "@/components/ui/kpi-carousel";
import { SectionHeader } from "@/components/ui/section-header";

const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const priorityColor: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-500",
  high: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  normal: "bg-[var(--surface-2)] text-[var(--muted-foreground)]",
  low: "bg-[var(--surface-2)] text-[var(--muted-foreground)]",
};

export default async function HRDashboardPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "hr") && !hasRole(profile.roles, "admin"))) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: staffRoles }, { data: leaves }, { data: payroll }, { data: departments }, { data: staffAttendance }, { data: announcements }, { data: reviews }] = await Promise.all([
    supabase.from("roles").select("id, name").in("name", ["teacher", "admin", "accounting", "hr"]),
    supabase.from("leave_requests").select("id, status, start_date, end_date, total_days, user_id, profiles:user_id(full_name), leave_types:leave_type_id(name)").order("created_at", { ascending: false }),
    supabase.from("payroll").select("id, user_id, month, amount, net_salary, status, profiles:user_id(full_name)").order("month", { ascending: false }),
    supabase.from("departments").select("id, name, code").eq("is_active", true),
    supabase.from("staff_attendance").select("status, date").gte("date", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]),
    supabase.from("hr_announcements").select("id, title, content, priority, published_at").eq("is_active", true).order("published_at", { ascending: false }).limit(5),
    supabase.from("performance_reviews").select("overall_rating, status").limit(100),
  ]);

  const staffRoleIds = (staffRoles || []).map(r => r.id);
  let totalStaff = 0;
  if (staffRoleIds.length > 0) {
    const { data: userRolesData } = await supabase.from("user_roles").select("user_id").in("role_id", staffRoleIds);
    totalStaff = new Set((userRolesData || []).map(ur => ur.user_id)).size;
  }

  const allLeaves = (leaves || []) as any[];
  const pendingLeaves = allLeaves.filter(l => l.status === "pending");
  const approvedLeaves = allLeaves.filter(l => l.status === "approved");
  const rejectedLeaves = allLeaves.filter(l => l.status === "rejected");

  const allPayroll = (payroll || []) as any[];
  const currentMonth = new Date().toISOString().substring(0, 7);
  const thisMonthPayroll = allPayroll.filter(p => p.month?.startsWith(currentMonth));
  const totalPayrollThisMonth = thisMonthPayroll.reduce((s, p) => s + Number(p.net_salary || p.amount), 0);
  const pendingPayroll = thisMonthPayroll.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.net_salary || p.amount), 0);
  const paidPayroll = thisMonthPayroll.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.net_salary || p.amount), 0);

  const payrollByMonth: Record<string, number> = {};
  allPayroll.forEach(p => {
    const m = p.month?.substring(0, 7);
    if (m) payrollByMonth[m] = (payrollByMonth[m] || 0) + Number(p.net_salary || p.amount);
  });
  const payrollTrend = Object.keys(payrollByMonth).sort().slice(-6).map(m => ({
    name: new Date(m + "-01").toLocaleString("en-IN", { month: "short", year: "2-digit" }),
    Payroll: Math.round(payrollByMonth[m]),
  }));

  const attAll = (staffAttendance || []) as any[];
  const attPresent = attAll.filter(a => a.status === "present").length;
  const attAbsent = attAll.filter(a => a.status === "absent").length;
  const attLate = attAll.filter(a => a.status === "late").length;

  const allReviews = (reviews || []) as any[];
  const avgRating = allReviews.length > 0
    ? (allReviews.reduce((s, r) => s + Number(r.overall_rating || 0), 0) / allReviews.length).toFixed(1)
    : null;

  const leavePieData = [
    { name: "Approved", value: approvedLeaves.length },
    { name: "Pending", value: pendingLeaves.length },
    { name: "Rejected", value: rejectedLeaves.length },
  ].filter(d => d.value > 0);

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5 fade-up">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-xs mb-0.5">Human Resources</p>
          <h1 className="text-[20px] lg:text-[24px] font-bold tracking-tight text-[var(--foreground)] leading-tight">
            {greeting}, {profile.full_name?.split(" ")[0]} 👋
          </h1>
          <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5">
            {totalStaff} staff · {(departments || []).length} departments
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="apple-card px-3 py-2 text-center">
            <p className="label-xs mb-0.5">Pending Leaves</p>
            <p className={`text-[16px] font-bold mono-num ${pendingLeaves.length > 0 ? "text-[var(--accent-amber)]" : "text-[var(--accent-green)]"}`}>{pendingLeaves.length}</p>
          </div>
          <div className="apple-card px-3 py-2 text-center">
            <p className="label-xs mb-0.5">This Month</p>
            <p className="text-[16px] font-bold mono-num text-[var(--foreground)]">{fmt(totalPayrollThisMonth)}</p>
          </div>
        </div>
      </div>

      {/* Mobile stat strip */}
      <div className="flex gap-2 sm:hidden">
        <div className="flex-1 apple-card px-3 py-2.5 text-center">
          <p className="label-xs mb-0.5">Staff</p>
          <p className="text-[15px] font-bold mono-num text-[var(--foreground)]">{totalStaff}</p>
        </div>
        <div className="flex-1 apple-card px-3 py-2.5 text-center">
          <p className="label-xs mb-0.5">Leaves</p>
          <p className={`text-[15px] font-bold mono-num ${pendingLeaves.length > 0 ? "text-[var(--accent-amber)]" : "text-[var(--accent-green)]"}`}>{pendingLeaves.length}</p>
        </div>
        <div className="flex-1 apple-card px-3 py-2.5 text-center">
          <p className="label-xs mb-0.5">Payroll</p>
          <p className="text-[15px] font-bold mono-num text-[var(--foreground)]">{fmt(totalPayrollThisMonth)}</p>
        </div>
      </div>

      {/* KPIs */}
      <KPICarousel cols={6}>
        <KPICard title="Total Staff" value={totalStaff} icon={Users} color="indigo" description="Active" />
        <KPICard title="Pending Leaves" value={pendingLeaves.length} icon={CalendarX} color={pendingLeaves.length > 0 ? "amber" : "green"} description="Awaiting" />
        <KPICard title="Month Payroll" value={fmt(totalPayrollThisMonth)} icon={Briefcase} color="green" description="This month" />
        <KPICard title="Pending Salary" value={fmt(pendingPayroll)} icon={Clock} color={pendingPayroll > 0 ? "red" : "green"} description="Unpaid" />
        <KPICard title="Departments" value={(departments || []).length} icon={Building2} color="blue" description="Active" />
        <KPICard title="Avg Rating" value={avgRating ? `${avgRating}/5` : "—"} icon={Star} color="amber" description="Performance" />
      </KPICarousel>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 apple-card p-4 lg:p-5">
          <SectionHeader title="Monthly Payroll Trend" subtitle="Last 6 months" href="/hr/payroll" hrefLabel="View all" className="mb-4" />
          <div className="h-40 lg:h-48">
            {payrollTrend.length > 0
              ? <BarChartWidget data={payrollTrend} xKey="name" yKey="Payroll" fillColor="#1d1d1f" />
              : <div className="h-full flex flex-col items-center justify-center text-[var(--muted-foreground)] gap-2"><BarChart3 size={28} className="opacity-20" /><p className="text-sm">No payroll data yet</p></div>}
          </div>
        </div>
        <div className="lg:col-span-2 apple-card p-4 lg:p-5">
          <SectionHeader title="Leave Status" subtitle="All time" href="/hr/leave" hrefLabel="Manage" className="mb-4" />
          <div className="h-40 lg:h-48">
            {leavePieData.length > 0
              ? <PieChartWidget data={leavePieData} colors={["#34c759", "#ff9f0a", "#ff3b30"]} />
              : <div className="h-full flex flex-col items-center justify-center text-[var(--muted-foreground)] gap-2"><CalendarX size={28} className="opacity-20" /><p className="text-sm">No leave requests yet</p></div>}
          </div>
        </div>
      </div>

      {/* Leaves + Payroll */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="apple-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <SectionHeader title="Pending Leave Requests" subtitle={`${pendingLeaves.length} awaiting`} icon={CalendarX} href="/hr/leave" hrefLabel="View all" />
          </div>
          {pendingLeaves.length === 0
            ? <div className="p-8 text-center"><CheckCircle2 size={28} className="text-[var(--accent-green)] mx-auto mb-2" /><p className="text-sm text-[var(--muted-foreground)]">No pending requests</p></div>
            : <div className="divide-y divide-[var(--border)]">
              {pendingLeaves.slice(0, 5).map((leave: any) => (
                <div key={leave.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors min-h-[52px]">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <CalendarX size={14} className="text-[var(--accent-amber)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--foreground)] truncate">{(leave.profiles as any)?.full_name || "Staff"}</p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">{(leave.leave_types as any)?.name || "Leave"} · {leave.start_date} → {leave.end_date}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-[var(--accent-amber)] shrink-0">Pending</span>
                </div>
              ))}
            </div>}
        </div>

        <div className="apple-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <SectionHeader title="This Month Payroll" subtitle={`${thisMonthPayroll.length} entries · ${fmt(paidPayroll)} paid`} icon={Briefcase} href="/hr/payroll" hrefLabel="Manage" />
          </div>
          {thisMonthPayroll.length === 0
            ? <div className="p-8 text-center"><Briefcase size={28} className="text-[var(--muted-foreground)] mx-auto mb-2 opacity-30" /><p className="text-sm text-[var(--muted-foreground)]">No payroll this month</p></div>
            : <div className="divide-y divide-[var(--border)]">
              {thisMonthPayroll.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors min-h-[52px]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${p.status === "paid" ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                    {p.status === "paid" ? <CheckCircle2 size={14} className="text-[var(--accent-green)]" /> : <Clock size={14} className="text-[var(--accent-amber)]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--foreground)] truncate">{(p.profiles as any)?.full_name || "Staff"}</p>
                    <p className="text-[11px] text-[var(--muted-foreground)] capitalize">{p.status}</p>
                  </div>
                  <span className="text-[13px] font-bold text-[var(--foreground)] mono-num">{fmt(Number(p.net_salary || p.amount))}</span>
                </div>
              ))}
            </div>}
        </div>
      </div>

      {/* Attendance + Announcements */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="apple-card p-4 lg:p-5">
          <SectionHeader title="Staff Attendance (7 Days)" subtitle={`${attAll.length} records`} icon={UserCheck} href="/hr/attendance" hrefLabel="Mark today" className="mb-4" />
          {attAll.length === 0
            ? <div className="flex flex-col items-center justify-center py-6 text-[var(--muted-foreground)] gap-2"><UserCheck size={28} className="opacity-20" /><p className="text-sm">No records yet</p></div>
            : <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Present", value: attPresent, color: "text-[var(--accent-green)]", bg: "bg-emerald-500/8", icon: CheckCircle2 },
                { label: "Absent", value: attAbsent, color: "text-[var(--accent-red)]", bg: "bg-red-500/8", icon: XCircle },
                { label: "Late", value: attLate, color: "text-[var(--accent-amber)]", bg: "bg-amber-500/8", icon: AlertTriangle },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className={`rounded-[12px] ${s.bg} border border-[var(--border)] p-3 text-center`}>
                    <Icon size={18} className={`${s.color} mx-auto mb-1`} />
                    <p className={`text-[20px] font-bold mono-num ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{s.label}</p>
                  </div>
                );
              })}
            </div>}
        </div>

        <div className="apple-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <SectionHeader title="HR Announcements" icon={Megaphone} href="/hr/announcements" hrefLabel="Post new" />
          </div>
          {(announcements || []).length === 0
            ? <div className="p-8 text-center"><Megaphone size={28} className="text-[var(--muted-foreground)] mx-auto mb-2 opacity-30" /><p className="text-sm text-[var(--muted-foreground)]">No announcements</p></div>
            : <div className="divide-y divide-[var(--border)]">
              {(announcements || []).map((a: any) => (
                <div key={a.id} className="px-4 py-3 hover:bg-[var(--surface-2)] transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize ${priorityColor[a.priority] || priorityColor.normal}`}>{a.priority}</span>
                    <p className="text-[13px] font-medium text-[var(--foreground)] truncate">{a.title}</p>
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>}
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <p className="label-xs mb-3">HR Modules</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { href: "/hr/staff", label: "Staff", icon: Users },
            { href: "/hr/leave", label: "Leave", icon: CalendarX },
            { href: "/hr/payroll", label: "Payroll", icon: Briefcase },
            { href: "/hr/attendance", label: "Attendance", icon: UserCheck },
            { href: "/hr/performance", label: "Performance", icon: Star },
            { href: "/hr/departments", label: "Departments", icon: Building2 },
          ].map(link => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}
                className="apple-card flex flex-col items-center gap-2 p-3 hover:bg-[var(--surface-2)] transition-colors group press-scale">
                <div className="w-9 h-9 rounded-[10px] bg-[var(--surface-2)] flex items-center justify-center group-hover:bg-[var(--foreground)] transition-colors">
                  <Icon size={15} className="text-[var(--foreground)] group-hover:text-[var(--background)] transition-colors" />
                </div>
                <p className="text-[10px] font-medium text-[var(--muted-foreground)] text-center">{link.label}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
