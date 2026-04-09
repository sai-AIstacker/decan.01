import { Suspense } from "react";
import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Users, BookOpen, Target, AlertTriangle, Calendar, Clock, CheckCircle2, Star, ArrowUpRight, ClipboardList, FileText, Megaphone } from "lucide-react";
import Link from "next/link";
import { KPICard } from "@/components/ui/dashboard-kpi-card";
import { KPICarousel } from "@/components/ui/kpi-carousel";

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
const planStatus: Record<string, string> = {
  draft: "bg-[var(--surface-2)] text-[var(--muted-foreground)]",
  published: "bg-zinc-900 dark:bg-zinc-100/10 text-zinc-900 dark:text-zinc-100 dark:text-zinc-300",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

function SectionSkeleton() {
  return (
    <div className="apple-card overflow-hidden animate-pulse">
      <div className="px-5 py-3.5 border-b border-[var(--border)]"><div className="h-4 w-32 rounded-lg bg-[var(--surface-2)]" /></div>
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: 4 }).map((_, j) => (
          <div key={j} className="flex items-center gap-3 px-5 py-3">
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

// ── Streamed: Performers ──
async function TeacherPerformers({ profileId, subjectLinks }: { profileId: string; subjectLinks: any[] }) {
  const supabase = await createClient();
  const subjectIds = subjectLinks.map((l: any) => l.subject_id);
  let topPerformers: any[] = [], weakStudents: any[] = [];
  if (subjectIds.length > 0) {
    const { data: marksData } = await supabase.from("marks").select("marks_obtained, grade, profiles:student_id(full_name), subjects(name)").in("subject_id", subjectIds).order("marks_obtained", { ascending: false }).limit(20);
    if (marksData && marksData.length > 0) { topPerformers = marksData.slice(0, 4); weakStudents = marksData.slice(-4).reverse(); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="apple-card p-5">
        <div className="flex items-center gap-2 mb-4"><Star size={14} className="text-amber-500" /><p className="text-[13px] font-semibold text-[var(--foreground)]">Top Performers</p></div>
        {topPerformers.length === 0
          ? <p className="text-sm text-[var(--muted-foreground)] text-center py-4">No marks data yet</p>
          : <div className="space-y-2">
            {topPerformers.map((tp: any, i: number) => {
              const student = Array.isArray(tp.profiles) ? tp.profiles[0] : tp.profiles;
              const subject = Array.isArray(tp.subjects) ? tp.subjects[0] : tp.subjects;
              return (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-[10px] bg-emerald-500/5 border border-emerald-500/10">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[var(--foreground)] truncate">{student?.full_name || "—"}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{subject?.name}</p>
                  </div>
                  <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 mono-num">{tp.marks_obtained}</p>
                </div>
              );
            })}
          </div>}
      </div>

      <div className="apple-card p-5">
        <div className="flex items-center gap-2 mb-4"><AlertTriangle size={14} className="text-red-500" /><p className="text-[13px] font-semibold text-[var(--foreground)]">Needs Attention</p></div>
        {weakStudents.length === 0
          ? <p className="text-sm text-[var(--muted-foreground)] text-center py-4">No marks data yet</p>
          : <div className="space-y-2">
            {weakStudents.map((ws: any, i: number) => {
              const student = Array.isArray(ws.profiles) ? ws.profiles[0] : ws.profiles;
              const subject = Array.isArray(ws.subjects) ? ws.subjects[0] : ws.subjects;
              return (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-[10px] bg-red-500/5 border border-red-500/10">
                  <AlertTriangle size={12} className="text-red-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[var(--foreground)] truncate">{student?.full_name || "—"}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{subject?.name}</p>
                  </div>
                  <p className="text-[13px] font-bold text-red-500 mono-num">{ws.marks_obtained}</p>
                </div>
              );
            })}
          </div>}
      </div>
    </div>
  );
}

export default async function TeacherDashboardPage() {
  const { profile } = await getSessionProfile();
  if (!profile || !hasRole(profile.roles, "teacher")) redirect("/dashboard");

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().getDay();

  const [{ data: metricsObj }, { data: homeroomClasses }, { data: subjectLinks }, { data: todayTimetable }, { data: pendingAssignments }, { data: recentNotices }, { data: lessonPlans }] = await Promise.all([
    supabase.rpc("get_teacher_analytics", { target_teacher_id: profile.id }),
    supabase.from("classes").select("id, name, section").eq("class_teacher_id", profile.id),
    supabase.from("class_subjects").select("class_id, subject_id, classes(name,section), subjects(name)").eq("teacher_id", profile.id),
    supabase.from("timetables").select("*, classes(name,section), subjects(name), time_slots(name,start_time,end_time)").eq("teacher_id", profile.id).eq("day_of_week", dayOfWeek),
    supabase.from("assignments").select("id, title, due_date, type, classes(name,section), subjects(name)").eq("teacher_id", profile.id).eq("status", "active").gte("due_date", today).order("due_date").limit(5),
    supabase.from("class_notices").select("id, title, priority, created_at").eq("teacher_id", profile.id).eq("is_active", true).order("created_at", { ascending: false }).limit(4),
    supabase.from("lesson_plans").select("id, title, plan_date, status, classes(name,section), subjects(name)").eq("teacher_id", profile.id).order("plan_date", { ascending: false }).limit(5),
  ]);

  const metrics = (metricsObj as any) || { classes_assigned: 0, students_taught: 0, avg_marks: 0 };
  const subjectClasses = (subjectLinks || []).map((l: any) => Array.isArray(l.classes) ? l.classes[0] : l.classes).filter(Boolean);
  const allClasses = Array.from(new Map([...(homeroomClasses || []), ...subjectClasses].map((c: any) => [c.id, c])).values());
  const classIds = allClasses.map((c: any) => c.id);

  let todayPresent = 0, todayTotal = 0;
  if (classIds.length > 0) {
    const { data: att } = await supabase.from("attendance").select("status").in("class_id", classIds).eq("date", today);
    todayTotal = (att || []).length;
    todayPresent = (att || []).filter(a => a.status === "present" || a.status === "late").length;
  }
  const attendancePct = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0;

  const todaySchedule = ((todayTimetable || []) as any[]).sort((a: any, b: any) => {
    const ta = Array.isArray(a.time_slots) ? a.time_slots[0] : a.time_slots;
    const tb = Array.isArray(b.time_slots) ? b.time_slots[0] : b.time_slots;
    return (ta?.start_time || "").localeCompare(tb?.start_time || "");
  });

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="label-xs mb-1">Teacher Portal</p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{greeting}, {profile.full_name?.split(" ")[0]} 👋</h1>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="apple-card px-4 py-2.5 text-center min-w-[90px]">
            <p className="label-xs mb-1">Attendance</p>
            <p className={`text-xl font-bold mono-num ${attendancePct >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{attendancePct}%</p>
          </div>
          <div className="apple-card px-4 py-2.5 text-center min-w-[90px]">
            <p className="label-xs mb-1">Periods</p>
            <p className="text-xl font-bold mono-num text-[var(--accent-indigo)]">{todaySchedule.length}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <KPICarousel cols={4}>
        <KPICard title="Classes" value={Math.max(metrics.classes_assigned, allClasses.length)} icon={BookOpen} color="indigo" description="Assigned" />
        <KPICard title="Students" value={metrics.students_taught} icon={Users} color="purple" trend={{ value: 3, isPositive: true }} />
        <KPICard title="Avg Marks" value={`${Math.round(metrics.avg_marks)}%`} icon={Target} color="amber" trend={{ value: 2, isPositive: true }} />
        <KPICard title="Periods Today" value={todaySchedule.length} icon={Clock} color="green" description="Scheduled" />
      </KPICarousel>

      {/* Schedule + Assignments */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="apple-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2"><Clock size={14} className="text-[var(--foreground)]" /><p className="text-[13px] font-semibold text-[var(--foreground)]">Today's Schedule</p></div>
            <Link href="/teacher/timetable" className="btn-ghost">Full <ArrowUpRight size={11} /></Link>
          </div>
          {todaySchedule.length === 0
            ? <div className="p-8 text-center"><Calendar size={28} className="text-[var(--muted-foreground)] mx-auto mb-2 opacity-30" /><p className="text-sm text-[var(--muted-foreground)]">No classes today</p></div>
            : (
              <div className="px-5 py-3 space-y-1">
                {todaySchedule.map((slot: any, i: number) => {
                  const ts = Array.isArray(slot.time_slots) ? slot.time_slots[0] : slot.time_slots;
                  const cls = Array.isArray(slot.classes) ? slot.classes[0] : slot.classes;
                  const sub = Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects;
                  return (
                    <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-[10px] hover:bg-[var(--surface-2)] transition-colors">
                      <div className="w-12 text-right shrink-0">
                        <p className="text-[10px] font-bold text-[var(--accent-indigo)]">{ts?.start_time?.substring(0, 5)}</p>
                        <p className="text-[9px] text-[var(--muted-foreground)]">{ts?.end_time?.substring(0, 5)}</p>
                      </div>
                      <div className="w-px h-8 bg-[var(--border)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--foreground)]">{sub?.name}</p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">{cls?.name} {cls?.section}</p>
                      </div>
                      <Link href="/teacher/attendance" className="btn-secondary text-[11px] px-2.5 py-1">Mark</Link>
                    </div>
                  );
                })}
              </div>
            )}
        </div>

        <div className="apple-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2"><ClipboardList size={14} className="text-violet-500" /><p className="text-[13px] font-semibold text-[var(--foreground)]">Upcoming Assignments</p></div>
            <Link href="/teacher/assignments" className="btn-ghost">View all <ArrowUpRight size={11} /></Link>
          </div>
          {(pendingAssignments || []).length === 0
            ? <div className="p-8 text-center"><ClipboardList size={28} className="text-[var(--muted-foreground)] mx-auto mb-2 opacity-30" /><p className="text-sm text-[var(--muted-foreground)]">No upcoming assignments</p></div>
            : (
              <div className="divide-y divide-[var(--border)]">
                {(pendingAssignments || []).map((a: any) => {
                  const cls = Array.isArray(a.classes) ? a.classes[0] : a.classes;
                  const sub = Array.isArray(a.subjects) ? a.subjects[0] : a.subjects;
                  const daysLeft = Math.ceil((new Date(a.due_date).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-2)] transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[var(--foreground)] truncate">{a.title}</p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">{sub?.name} · {cls?.name} {cls?.section}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize ${typeColor[a.type] || typeColor.other}`}>{a.type}</span>
                        <p className={`text-[10px] ${daysLeft <= 1 ? "text-red-500 font-semibold" : "text-[var(--muted-foreground)]"}`}>{daysLeft === 0 ? "Due today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d`}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>

      {/* Performers (streamed — separate DB calls) */}
      <Suspense fallback={<div className="grid gap-4 lg:grid-cols-2"><SectionSkeleton /><SectionSkeleton /></div>}>
        <TeacherPerformers profileId={profile.id} subjectLinks={subjectLinks || []} />
      </Suspense>

      {/* Lesson Plans + Notices */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="apple-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2"><FileText size={14} className="text-rose-500" /><p className="text-[13px] font-semibold text-[var(--foreground)]">Lesson Plans</p></div>
            <Link href="/teacher/lesson-plans" className="btn-ghost">View all <ArrowUpRight size={11} /></Link>
          </div>
          {(lessonPlans || []).length === 0
            ? <div className="p-8 text-center"><FileText size={28} className="text-[var(--muted-foreground)] mx-auto mb-2 opacity-30" /><p className="text-sm text-[var(--muted-foreground)]">No lesson plans yet</p></div>
            : <div className="divide-y divide-[var(--border)]">
              {(lessonPlans || []).map((p: any) => {
                const cls = Array.isArray(p.classes) ? p.classes[0] : p.classes;
                const sub = Array.isArray(p.subjects) ? p.subjects[0] : p.subjects;
                return (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-2)] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--foreground)] truncate">{p.title}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)]">{sub?.name} · {cls?.name} {cls?.section} · {p.plan_date}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize ${planStatus[p.status] || ""}`}>{p.status}</span>
                  </div>
                );
              })}
            </div>}
        </div>

        <div className="apple-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2"><Megaphone size={14} className="text-orange-500" /><p className="text-[13px] font-semibold text-[var(--foreground)]">My Notices</p></div>
            <Link href="/teacher/notices" className="btn-ghost">Manage <ArrowUpRight size={11} /></Link>
          </div>
          {(recentNotices || []).length === 0
            ? <div className="p-8 text-center"><Megaphone size={28} className="text-[var(--muted-foreground)] mx-auto mb-2 opacity-30" /><p className="text-sm text-[var(--muted-foreground)]">No notices posted</p></div>
            : <div className="divide-y divide-[var(--border)]">
              {(recentNotices || []).map((n: any) => (
                <div key={n.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-2)] transition-colors">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize shrink-0 ${priorityColor[n.priority] || priorityColor.normal}`}>{n.priority}</span>
                  <p className="text-[13px] font-medium text-[var(--foreground)] truncate flex-1">{n.title}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] shrink-0">{new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
              ))}
            </div>}
        </div>
      </div>
    </div>
  );
}
