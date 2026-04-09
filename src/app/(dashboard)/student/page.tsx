import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, Clock, Target, Award, Calendar, FileText, ClipboardList, TrendingUp, AlertTriangle, CheckCircle2, CreditCard, Bell, ChevronRight, Star, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { KPICard } from "@/components/ui/dashboard-kpi-card";
import { KPICarousel } from "@/components/ui/kpi-carousel";
import { SectionHeader } from "@/components/ui/section-header";

const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
const typeColor: Record<string, string> = {
  homework: "bg-zinc-900 dark:bg-zinc-100/10 text-zinc-900 dark:text-zinc-100 dark:text-zinc-300",
  project: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  test: "bg-red-500/10 text-red-500",
  classwork: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  other: "bg-[var(--surface-2)] text-[var(--muted-foreground)]",
};
const priorityColor: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-500",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  normal: "bg-zinc-900 dark:bg-zinc-100/10 text-zinc-900 dark:text-zinc-100 dark:text-zinc-300",
  low: "bg-[var(--surface-2)] text-[var(--muted-foreground)]",
};

export default async function StudentDashboardPage() {
  const { profile } = await getSessionProfile();
  if (!profile || !hasRole(profile.roles, "student")) redirect("/dashboard");

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().getDay();

  const [{ data: statsObj }, { data: enrollment }, { data: recentMarks }, { data: todayTimetable }, { data: upcomingExams }, { data: activeAssignments }, { data: recentAttendance }, { data: invoices }, { data: notices }] = await Promise.all([
    supabase.rpc("get_student_dashboard_stats", { p_student_id: profile.id }),
    supabase.from("enrollments").select("class_id, classes(id,name,section)").eq("student_id", profile.id).eq("status", "active").order("created_at", { ascending: false }).limit(1),
    supabase.from("marks").select("marks_obtained, grade, exams(name,start_date), subjects(name), exam_subjects(max_marks)").eq("student_id", profile.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("timetables").select("*, subjects(name), profiles:teacher_id(full_name), time_slots(name,start_time,end_time)").eq("day_of_week", dayOfWeek),
    supabase.from("exams").select("id, name, start_date, end_date, exam_types(name)").gte("end_date", today).order("start_date").limit(3),
    supabase.from("assignments").select("id, title, due_date, type, subjects(name)").eq("status", "active").gte("due_date", today).order("due_date").limit(5),
    supabase.from("attendance").select("status, date").eq("student_id", profile.id).order("date", { ascending: false }).limit(30),
    supabase.from("invoices").select("id, title, amount, status, due_date").eq("student_id", profile.id).neq("status", "paid").order("due_date").limit(3),
    supabase.from("class_notices").select("id, title, priority, content, created_at").eq("is_active", true).order("created_at", { ascending: false }).limit(4),
  ]);

  const stats = (statsObj as any) || { class_name: "Not Enrolled", att_pct: 0, perf_pct: 0, exams_count: 0, pending_fees: 0, assignments: 0 };
  const classInfo = enrollment?.[0] ? (Array.isArray((enrollment[0] as any).classes) ? (enrollment[0] as any).classes[0] : (enrollment[0] as any).classes) : null;
  const classId = classInfo?.id;
  const mySchedule = classId
    ? ((todayTimetable || []) as any[]).filter(t => t.class_id === classId).sort((a: any, b: any) => {
        const ta = Array.isArray(a.time_slots) ? a.time_slots[0] : a.time_slots;
        const tb = Array.isArray(b.time_slots) ? b.time_slots[0] : b.time_slots;
        return (ta?.start_time || "").localeCompare(tb?.start_time || "");
      }) : [];

  const attRecent = (recentAttendance || []) as any[];
  const presentCount = attRecent.filter(a => a.status === "present" || a.status === "late").length;
  const attPct30 = attRecent.length > 0 ? Math.round((presentCount / attRecent.length) * 100) : 0;

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="label-xs mb-1">Student Portal</p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Hello, {profile.full_name?.split(" ")[0]} 🎓</h1>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">{stats.class_name} · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="apple-card px-4 py-2.5 text-center min-w-[90px]">
            <p className="label-xs mb-1">Performance</p>
            <p className="text-xl font-bold mono-num text-[var(--accent-indigo)]">{stats.perf_pct}%</p>
          </div>
          <div className="apple-card px-4 py-2.5 text-center min-w-[90px]">
            <p className="label-xs mb-1">Attendance</p>
            <p className={`text-xl font-bold mono-num ${stats.att_pct >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{stats.att_pct}%</p>
          </div>
        </div>
      </div>

      {/* Fee Alert */}
      {(invoices || []).length > 0 && (
        <div className="rounded-[12px] bg-red-500/6 dark:bg-red-500/10 border border-red-500/15 p-4 flex items-start gap-3">
          <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-red-600 dark:text-red-400">Pending Fee Payments</p>
            <div className="mt-1.5 space-y-1">
              {(invoices || []).map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--muted-foreground)]">{inv.title}</span>
                  <span className="font-semibold text-red-600 dark:text-red-400 mono-num">{fmt(Number(inv.amount))} · Due {inv.due_date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <KPICarousel cols={6}>
        <KPICard title="Attendance" value={`${stats.att_pct}%`} icon={CheckCircle2} color={stats.att_pct >= 75 ? "green" : "red"} description="Overall" />
        <KPICard title="Performance" value={`${stats.perf_pct}%`} icon={Target} color="indigo" description="Avg marks" />
        <KPICard title="Exams Done" value={stats.exams_count} icon={Award} color="amber" description="Attempted" />
        <KPICard title="Assignments" value={stats.assignments} icon={ClipboardList} color="purple" description="Pending" />
        <KPICard title="Periods Today" value={mySchedule.length} icon={Clock} color="blue" description="Scheduled" />
        <KPICard title="Pending Fees" value={stats.pending_fees > 0 ? fmt(stats.pending_fees) : "Clear"} icon={CreditCard} color={stats.pending_fees > 0 ? "red" : "green"} description={stats.pending_fees > 0 ? "Due" : "All paid"} />
      </KPICarousel>

      {/* Schedule + Assignments */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="apple-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2"><Clock size={14} className="text-[var(--foreground)]" /><p className="text-[13px] font-semibold text-[var(--foreground)]">Today's Classes</p></div>
            <Link href="/student/timetable" className="btn-ghost">Full <ArrowUpRight size={11} /></Link>
          </div>
          {mySchedule.length === 0
            ? <div className="p-8 text-center"><Calendar size={28} className="text-[var(--muted-foreground)] mx-auto mb-2 opacity-30" /><p className="text-sm text-[var(--muted-foreground)]">No classes today</p></div>
            : <div className="px-5 py-3 space-y-1">
              {mySchedule.map((slot: any, i: number) => {
                const ts = Array.isArray(slot.time_slots) ? slot.time_slots[0] : slot.time_slots;
                const sub = Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects;
                const teacher = Array.isArray(slot.profiles) ? slot.profiles[0] : slot.profiles;
                return (
                  <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-[10px] hover:bg-[var(--surface-2)] transition-colors">
                    <div className="w-12 text-right shrink-0">
                      <p className="text-[10px] font-bold text-[var(--accent-indigo)]">{ts?.start_time?.substring(0, 5)}</p>
                      <p className="text-[9px] text-[var(--muted-foreground)]">{ts?.end_time?.substring(0, 5)}</p>
                    </div>
                    <div className="w-px h-8 bg-[var(--border)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--foreground)]">{sub?.name}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)]">{teacher?.full_name || "—"}</p>
                    </div>
                  </div>
                );
              })}
            </div>}
        </div>

        <div className="apple-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2"><ClipboardList size={14} className="text-violet-500" /><p className="text-[13px] font-semibold text-[var(--foreground)]">Pending Assignments</p></div>
          </div>
          {(activeAssignments || []).length === 0
            ? <div className="p-8 text-center"><ClipboardList size={28} className="text-[var(--muted-foreground)] mx-auto mb-2 opacity-30" /><p className="text-sm text-[var(--muted-foreground)]">All caught up!</p></div>
            : <div className="divide-y divide-[var(--border)]">
              {(activeAssignments || []).map((a: any) => {
                const sub = Array.isArray(a.subjects) ? a.subjects[0] : a.subjects;
                const daysLeft = Math.ceil((new Date(a.due_date).getTime() - Date.now()) / 86400000);
                return (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-2)] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--foreground)] truncate">{a.title}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)]">{sub?.name}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize ${typeColor[a.type] || typeColor.other}`}>{a.type}</span>
                      <p className={`text-[10px] ${daysLeft <= 1 ? "text-red-500 font-semibold" : "text-[var(--muted-foreground)]"}`}>{daysLeft === 0 ? "Due today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d`}</p>
                    </div>
                  </div>
                );
              })}
            </div>}
        </div>
      </div>

      {/* Results + Exams */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="apple-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2"><Star size={14} className="text-amber-500" /><p className="text-[13px] font-semibold text-[var(--foreground)]">Recent Results</p></div>
            <Link href="/student/results" className="btn-ghost">Full report <ArrowUpRight size={11} /></Link>
          </div>
          {(recentMarks || []).length === 0
            ? <div className="p-8 text-center"><Award size={28} className="text-[var(--muted-foreground)] mx-auto mb-2 opacity-30" /><p className="text-sm text-[var(--muted-foreground)]">No results yet</p></div>
            : <div className="divide-y divide-[var(--border)]">
              {(recentMarks || []).map((m: any, i: number) => {
                const sub = Array.isArray(m.subjects) ? m.subjects[0] : m.subjects;
                const exam = Array.isArray(m.exams) ? m.exams[0] : m.exams;
                const es = Array.isArray(m.exam_subjects) ? m.exam_subjects[0] : m.exam_subjects;
                const maxMarks = es?.max_marks || 100;
                const pct = Math.round((m.marks_obtained / maxMarks) * 100);
                return (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-2)] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--foreground)]">{sub?.name}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)]">{exam?.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-bold text-[var(--foreground)] mono-num">{m.marks_obtained}/{maxMarks}</p>
                      <p className={`text-[10px] font-semibold ${pct >= 60 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{m.grade} ({pct}%)</p>
                    </div>
                  </div>
                );
              })}
            </div>}
        </div>

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
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${daysLeft <= 3 ? "bg-red-500/10 text-red-500" : daysLeft <= 7 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-zinc-900 dark:bg-zinc-100/10 text-zinc-900 dark:text-zinc-100 dark:text-zinc-300"}`}>{daysLeft <= 0 ? "Today" : `${daysLeft}d`}</span>
                  </div>
                );
              })}
            </div>}
        </div>
      </div>

      {/* Notices + Attendance Heatmap */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="apple-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)]">
            <div className="flex items-center gap-2"><Bell size={14} className="text-orange-500" /><p className="text-[13px] font-semibold text-[var(--foreground)]">Class Notices</p></div>
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

        <div className="apple-card p-5">
          <div className="flex items-center gap-2 mb-4"><TrendingUp size={14} className="text-emerald-500" /><p className="text-[13px] font-semibold text-[var(--foreground)]">Attendance — Last 30 Days</p></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <p className={`text-2xl font-bold mono-num ${attPct30 >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{attPct30}%</p>
              <p className="label-xs mt-0.5">Rate</p>
            </div>
            <div className="flex-1">
              <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5 overflow-hidden">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${attPct30 >= 75 ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${attPct30}%` }} />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-[var(--muted-foreground)]">
                <span>{presentCount} present</span><span>{attRecent.length - presentCount} absent</span>
              </div>
            </div>
          </div>
          {attPct30 < 75 && (
            <div className="rounded-[10px] bg-red-500/6 border border-red-500/15 p-2.5 mb-3">
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">⚠ Below 75% minimum requirement</p>
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {attRecent.slice(0, 30).map((a: any, i: number) => (
              <div key={i} title={`${a.date}: ${a.status}`}
                className={`w-5 h-5 rounded-[4px] ${a.status === "present" ? "bg-emerald-400 dark:bg-emerald-500" : a.status === "late" ? "bg-amber-400" : "bg-red-400 dark:bg-red-500"}`} />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2.5">
            {[["bg-emerald-400", "Present"], ["bg-amber-400", "Late"], ["bg-red-400", "Absent"]].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1"><div className={`w-2.5 h-2.5 rounded-sm ${c}`} /><span className="text-[10px] text-[var(--muted-foreground)]">{l}</span></div>
            ))}
          </div>
          <Link href="/student/attendance" className="mt-3 inline-flex items-center gap-1 text-[12px] text-[var(--accent-indigo)] hover:underline">Full history <ChevronRight size={11} /></Link>
        </div>
      </div>
    </div>
  );
}
