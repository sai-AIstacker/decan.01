import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Users, Clock, CreditCard, AlertTriangle, CheckCircle2, FileText, Bell, ArrowUpRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { KPICard } from "@/components/ui/dashboard-kpi-card";
import { KPICarousel } from "@/components/ui/kpi-carousel";
import { SectionHeader } from "@/components/ui/section-header";
import { UserAvatarServer } from "@/components/ui/user-avatar";

const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
const priorityColor: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-500",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  normal: "bg-zinc-900 dark:bg-zinc-100/10 text-zinc-900 dark:text-zinc-100 dark:text-zinc-300",
  low: "bg-[var(--surface-2)] text-[var(--muted-foreground)]",
};
const childColors = ["bg-zinc-900 dark:bg-zinc-100", "bg-violet-500", "bg-emerald-500", "bg-rose-500", "bg-amber-500"];

export default async function ParentDashboardPage() {
  const { profile } = await getSessionProfile();
  if (!profile || !hasRole(profile.roles, "parent")) redirect("/dashboard");

  const supabase = await createClient();
  const { data: childrenLinks } = await supabase.from("parent_students").select("student_id, profiles!parent_students_student_id_fkey(id, full_name, email)").eq("parent_id", profile.id);
  const studentIds = (childrenLinks || []).map(c => c.student_id);

  if (studentIds.length === 0) {
    return (
      <div className="rounded-[16px] border-2 border-dashed border-[var(--border)] p-16 text-center">
        <Users size={36} className="text-[var(--muted-foreground)] mx-auto mb-3 opacity-30" />
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">No Children Linked</h2>
        <p className="text-[13px] text-[var(--muted-foreground)]">Contact administration to link your student accounts.</p>
      </div>
    );
  }

  const [{ data: statsObj }, { data: enrollments }, { data: recentMarks }, { data: invoices }, { data: recentAttendance }, { data: upcomingExams }, { data: notices }] = await Promise.all([
    supabase.rpc("get_parent_dashboard_stats", { p_parent_id: profile.id }),
    supabase.from("enrollments").select("student_id, classes(name,section)").in("student_id", studentIds).eq("status", "active"),
    supabase.from("marks").select("student_id, marks_obtained, grade, subjects(name), exams(name), exam_subjects(max_marks)").in("student_id", studentIds).order("created_at", { ascending: false }).limit(10),
    supabase.from("invoices").select("id, student_id, title, amount, status, due_date").in("student_id", studentIds).order("due_date").limit(10),
    supabase.from("attendance").select("student_id, status, date").in("student_id", studentIds).order("date", { ascending: false }).limit(60),
    supabase.from("exams").select("id, name, start_date, end_date, exam_types(name)").gte("end_date", new Date().toISOString().split("T")[0]).order("start_date").limit(3),
    supabase.from("class_notices").select("id, title, priority, content, created_at").eq("is_active", true).order("created_at", { ascending: false }).limit(4),
  ]);

  const stats = (statsObj as any) || { child_count: 0, att_pct: 0, perf_pct: 0, paid_fees: 0, pending_fees: 0 };
  const childMap: Record<string, any> = {};
  (childrenLinks || []).forEach((c: any) => { const p = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles; if (p) childMap[c.student_id] = p; });
  const classMap: Record<string, string> = {};
  (enrollments || []).forEach((e: any) => { const cls = Array.isArray(e.classes) ? e.classes[0] : e.classes; if (cls) classMap[e.student_id] = `${cls.name} ${cls.section}`; });
  const attByChild: Record<string, { present: number; total: number }> = {};
  (recentAttendance || []).forEach((a: any) => { if (!attByChild[a.student_id]) attByChild[a.student_id] = { present: 0, total: 0 }; attByChild[a.student_id].total++; if (a.status === "present" || a.status === "late") attByChild[a.student_id].present++; });
  const marksByChild: Record<string, number[]> = {};
  (recentMarks || []).forEach((m: any) => { if (!marksByChild[m.student_id]) marksByChild[m.student_id] = []; marksByChild[m.student_id].push(Number(m.marks_obtained)); });
  const allInvoices = (invoices || []) as any[];
  const pendingInvoices = allInvoices.filter(i => i.status !== "paid");
  const paidTotal = allInvoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
  const pendingTotal = pendingInvoices.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="label-xs mb-1">Parent Portal</p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Welcome, {profile.full_name?.split(" ")[0]} 👨‍👩‍👧</h1>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">{stats.child_count} {stats.child_count === 1 ? "child" : "children"} linked · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="apple-card px-4 py-2.5 text-center min-w-[90px]">
            <p className="label-xs mb-1">Avg Attendance</p>
            <p className={`text-xl font-bold mono-num ${stats.att_pct >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{stats.att_pct}%</p>
          </div>
          <div className="apple-card px-4 py-2.5 text-center min-w-[90px]">
            <p className="label-xs mb-1">Avg Performance</p>
            <p className="text-xl font-bold mono-num text-[var(--accent-indigo)]">{stats.perf_pct}%</p>
          </div>
        </div>
      </div>

      {/* Fee Alert */}
      {pendingTotal > 0 && (
        <div className="rounded-[12px] bg-red-500/6 dark:bg-red-500/10 border border-red-500/15 p-4 flex items-start gap-3">
          <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-red-600 dark:text-red-400">Pending Fees: {fmt(pendingTotal)}</p>
            <div className="mt-1.5 space-y-1">
              {pendingInvoices.slice(0, 3).map((inv: any) => {
                const child = childMap[inv.student_id];
                return (
                  <div key={inv.id} className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--muted-foreground)]">{child?.full_name} — {inv.title}</span>
                    <span className="font-semibold text-red-600 dark:text-red-400 mono-num">{fmt(Number(inv.amount))} · Due {inv.due_date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <KPICarousel cols={4}>
        <KPICard title="Children" value={stats.child_count} icon={Users} color="indigo" description="Linked" />
        <KPICard title="Avg Attendance" value={`${stats.att_pct}%`} icon={Clock} color={stats.att_pct >= 75 ? "green" : "red"} description="All children" />
        <KPICard title="Fees Paid" value={fmt(paidTotal)} icon={CheckCircle2} color="green" description="Total paid" />
        <KPICard title="Fees Pending" value={fmt(pendingTotal)} icon={CreditCard} color={pendingTotal > 0 ? "red" : "green"} description={pendingTotal > 0 ? "Needs payment" : "All clear"} />
      </KPICarousel>

      {/* Per-Child Cards */}
      <div>
        <p className="label-xs mb-3">Children Overview</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {studentIds.map((sid, idx) => {
            const child = childMap[sid];
            if (!child) return null;
            const att = attByChild[sid];
            const attPct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null;
            const marks = marksByChild[sid] || [];
            const avgMark = marks.length > 0 ? Math.round(marks.reduce((s, m) => s + m, 0) / marks.length) : null;
            const childClass = classMap[sid];
            const childPending = allInvoices.filter(i => i.student_id === sid && i.status !== "paid").reduce((s, i) => s + Number(i.amount), 0);
            return (
              <div key={sid} className="apple-card p-4">
                <div className="flex items-center gap-3 mb-4">
                  <UserAvatarServer userId={sid} name={child.full_name} size={40} className="rounded-[12px]" />
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--foreground)]">{child.full_name}</p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">{childClass || "Not enrolled"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: "Attendance", value: attPct !== null ? `${attPct}%` : "—", ok: attPct !== null && attPct >= 75 },
                    { label: "Avg Marks", value: avgMark !== null ? String(avgMark) : "—", ok: avgMark !== null && avgMark >= 60 },
                    { label: "Fees", value: childPending > 0 ? fmt(childPending) : "✓", ok: childPending === 0 },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-[10px] bg-[var(--surface-2)] p-2.5 text-center">
                      <p className={`text-[13px] font-bold mono-num ${stat.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{stat.value}</p>
                      <p className="label-xs mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {[
                    { href: `/parent/attendance?student=${sid}`, label: "Attendance" },
                    { href: `/parent/results?student=${sid}`, label: "Results" },
                    { href: `/parent/timetable?student=${sid}`, label: "Schedule" },
                  ].map(btn => (
                    <Link key={btn.href} href={btn.href} className="flex-1 text-center py-1.5 rounded-[8px] text-[10px] font-semibold bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors">{btn.label}</Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exams + Notices */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="apple-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)]">
            <div className="flex items-center gap-2"><FileText size={14} className="text-red-500" /><p className="text-[13px] font-semibold text-[var(--foreground)]">Upcoming Exams</p></div>
          </div>
          {(upcomingExams || []).length === 0
            ? <div className="p-8 text-center"><FileText size={28} className="text-[var(--muted-foreground)] mx-auto mb-2 opacity-30" /><p className="text-sm text-[var(--muted-foreground)]">No upcoming exams</p></div>
            : <div className="divide-y divide-[var(--border)]">
              {(upcomingExams || []).map((exam: any) => {
                const et = Array.isArray(exam.exam_types) ? exam.exam_types[0] : exam.exam_types;
                const daysLeft = Math.ceil((new Date(exam.start_date).getTime() - Date.now()) / 86400000);
                return (
                  <div key={exam.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-2)] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--foreground)]">{exam.name}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)]">{et?.name} · {exam.start_date}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${daysLeft <= 3 ? "bg-red-500/10 text-red-500" : "bg-zinc-900 dark:bg-zinc-100/10 text-zinc-900 dark:text-zinc-100 dark:text-zinc-300"}`}>{daysLeft <= 0 ? "Today" : `${daysLeft}d`}</span>
                  </div>
                );
              })}
            </div>}
        </div>

        <div className="apple-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)]">
            <div className="flex items-center gap-2"><Bell size={14} className="text-orange-500" /><p className="text-[13px] font-semibold text-[var(--foreground)]">School Notices</p></div>
          </div>
          {(notices || []).length === 0
            ? <div className="p-8 text-center"><Bell size={28} className="text-[var(--muted-foreground)] mx-auto mb-2 opacity-30" /><p className="text-sm text-[var(--muted-foreground)]">No notices</p></div>
            : <div className="divide-y divide-[var(--border)]">
              {(notices || []).map((n: any) => (
                <div key={n.id} className="px-5 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize ${priorityColor[n.priority] || priorityColor.normal}`}>{n.priority}</span>
                    <p className="text-[13px] font-medium text-[var(--foreground)] truncate">{n.title}</p>
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-2">{n.content}</p>
                </div>
              ))}
            </div>}
        </div>
      </div>
    </div>
  );
}
