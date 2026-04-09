import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, ChevronRight, Users, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function MyClassesPage() {
  const { profile } = await getSessionProfile();
  if (!profile || !hasRole(profile.roles, "teacher")) redirect("/dashboard");

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ data: homeroomClasses }, { data: subjectLinks }] = await Promise.all([
    supabase.from("classes").select("id, name, section, academic_years(name)").eq("class_teacher_id", profile.id),
    supabase.from("class_subjects").select("class_id, subject_id, classes(id,name,section,academic_years(name)), subjects(id,name,code)").eq("teacher_id", profile.id),
  ]);

  // Build unique class list with subjects
  const classMap: Record<string, { id: string; name: string; section: string; year: string; subjects: any[]; isHomeroom: boolean }> = {};

  (homeroomClasses || []).forEach((c: any) => {
    classMap[c.id] = { id: c.id, name: c.name, section: c.section, year: c.academic_years?.name || "", subjects: [], isHomeroom: true };
  });

  (subjectLinks || []).forEach((l: any) => {
    const cls = Array.isArray(l.classes) ? l.classes[0] : l.classes;
    const sub = Array.isArray(l.subjects) ? l.subjects[0] : l.subjects;
    if (!cls) return;
    if (!classMap[cls.id]) classMap[cls.id] = { id: cls.id, name: cls.name, section: cls.section, year: cls.academic_years?.name || "", subjects: [], isHomeroom: false };
    if (sub) classMap[cls.id].subjects.push(sub);
  });

  const classes = Object.values(classMap);

  // For each class get student count + today attendance
  const classIds = classes.map((c) => c.id);
  const [{ data: enrollments }, { data: todayAtt }] = await Promise.all([
    classIds.length > 0 ? supabase.from("enrollments").select("class_id, student_id").in("class_id", classIds).eq("status", "active") : Promise.resolve({ data: [] }),
    classIds.length > 0 ? supabase.from("attendance").select("class_id, status").in("class_id", classIds).eq("date", today) : Promise.resolve({ data: [] }),
  ]);

  const studentCountByClass: Record<string, number> = {};
  (enrollments || []).forEach((e) => { studentCountByClass[e.class_id] = (studentCountByClass[e.class_id] || 0) + 1; });

  const attByClass: Record<string, { present: number; total: number }> = {};
  (todayAtt || []).forEach((a) => {
    if (!attByClass[a.class_id]) attByClass[a.class_id] = { present: 0, total: 0 };
    attByClass[a.class_id].total++;
    if (a.status === "present" || a.status === "late") attByClass[a.class_id].present++;
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/teacher" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Teacher</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">My Classes</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          My Classes
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{classes.length} classes assigned</p>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-16 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No classes assigned yet</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">Contact your admin to get classes assigned.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => {
            const studentCount = studentCountByClass[cls.id] || 0;
            const att = attByClass[cls.id];
            const attPct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null;
            return (
              <div key={cls.id} className="apple-card hover:shadow-lg transition-all p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{cls.name} <span className="text-zinc-900 dark:text-zinc-100 dark:text-zinc-300">{cls.section}</span></h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cls.year}</p>
                  </div>
                  {cls.isHomeroom && (
                    <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-zinc-300 text-xs font-medium">Homeroom</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                    <Users className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{studentCount}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Students</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                    {attPct !== null ? (
                      <>
                        <CheckCircle2 className={`w-4 h-4 mx-auto mb-1 ${attPct >= 75 ? "text-emerald-500" : "text-rose-500"}`} />
                        <p className={`text-xl font-bold ${attPct >= 75 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{attPct}%</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Today</p>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Not marked</p>
                      </>
                    )}
                  </div>
                </div>

                {cls.subjects.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Subjects</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cls.subjects.map((s: any) => (
                        <span key={s.id} className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-zinc-800 text-zinc-900 dark:text-blue-300 text-xs font-medium">{s.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Link href={`/teacher/attendance?class=${cls.id}`} className="flex-1 text-center px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200/60 dark:border-emerald-800/40">
                    Attendance
                  </Link>
                  <Link href={`/teacher/marks?class=${cls.id}`} className="flex-1 text-center px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors border border-amber-200/60 dark:border-amber-800/40">
                    Marks
                  </Link>
                  <Link href={`/teacher/students?class=${cls.id}`} className="flex-1 text-center px-3 py-2 rounded-xl bg-zinc-100 dark:bg-blue-900/30 text-zinc-900 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-zinc-200/60 dark:border-blue-800/40">
                    Students
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
