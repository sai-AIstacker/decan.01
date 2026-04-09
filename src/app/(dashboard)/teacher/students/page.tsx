import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Users, ChevronRight, Mail, Phone, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { AddNoteForm } from "./ui/add-note-form";

export default async function MyStudentsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { profile } = await getSessionProfile();
  if (!profile || !hasRole(profile.roles, "teacher")) redirect("/dashboard");

  const supabase = await createClient();
  const params: Record<string, string | undefined> = await searchParams ?? {};

  const [{ data: homeroomClasses }, { data: subjectLinks }] = await Promise.all([
    supabase.from("classes").select("id, name, section").eq("class_teacher_id", profile.id),
    supabase.from("class_subjects").select("class_id, classes(id,name,section)").eq("teacher_id", profile.id),
  ]);

  const classMap: Record<string, { id: string; name: string; section: string }> = {};
  (homeroomClasses || []).forEach((c: any) => { classMap[c.id] = c; });
  (subjectLinks || []).forEach((l: any) => {
    const cls = Array.isArray(l.classes) ? l.classes[0] : l.classes;
    if (cls) classMap[cls.id] = cls;
  });
  const allClasses = Object.values(classMap);
  const classIds = params.class ? [params.class] : allClasses.map((c) => c.id);

  const { data: enrollments } = classIds.length > 0
    ? await supabase.from("enrollments").select("student_id, class_id, profiles:student_id(id,full_name,email,phone)").in("class_id", classIds).eq("status", "active")
    : { data: [] };

  // Unique students
  const studentMap: Record<string, any> = {};
  (enrollments || []).forEach((e: any) => {
    const p = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
    if (p && !studentMap[p.id]) studentMap[p.id] = { ...p, classId: e.class_id };
  });
  let students = Object.values(studentMap);

  if (params.search) {
    const q = params.search.toLowerCase();
    students = students.filter((s) => s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
  }

  const studentIds = students.map((s) => s.id);

  // Attendance rates (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const [{ data: attData }, { data: marksData }, { data: notesData }] = await Promise.all([
    studentIds.length > 0 ? supabase.from("attendance").select("student_id, status").in("student_id", studentIds).gte("date", thirtyDaysAgo) : Promise.resolve({ data: [] }),
    studentIds.length > 0 ? supabase.from("marks").select("student_id, marks_obtained, grade, subjects(name)").in("student_id", studentIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    studentIds.length > 0 ? supabase.from("teacher_notes").select("student_id, note, category, created_at").eq("teacher_id", profile.id).in("student_id", studentIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  const attByStudent: Record<string, { present: number; total: number }> = {};
  (attData || []).forEach((a) => {
    if (!attByStudent[a.student_id]) attByStudent[a.student_id] = { present: 0, total: 0 };
    attByStudent[a.student_id].total++;
    if (a.status === "present" || a.status === "late") attByStudent[a.student_id].present++;
  });

  const marksByStudent: Record<string, any[]> = {};
  (marksData || []).forEach((m: any) => {
    if (!marksByStudent[m.student_id]) marksByStudent[m.student_id] = [];
    marksByStudent[m.student_id].push(m);
  });

  const notesByStudent: Record<string, any[]> = {};
  (notesData || []).forEach((n: any) => {
    if (!notesByStudent[n.student_id]) notesByStudent[n.student_id] = [];
    notesByStudent[n.student_id].push(n);
  });

  const categoryColor: Record<string, string> = {
    general: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    academic: "bg-blue-100 text-zinc-900 dark:bg-zinc-800 dark:text-blue-300",
    behavioral: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    attendance: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    positive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/teacher" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Teacher</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">My Students</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          My Students
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{students.length} students</p>
      </div>

      {/* Class Filter */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/teacher/students" className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${!params.class ? "bg-[#1d1d1f] text-white border-zinc-900" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
          All Classes
        </Link>
        {allClasses.map((c) => (
          <Link key={c.id} href={`/teacher/students?class=${c.id}`} className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${params.class === c.id ? "bg-[#1d1d1f] text-white border-zinc-900" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            {c.name} {c.section}
          </Link>
        ))}
      </div>

      {students.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-16 text-center">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No students found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {students.map((student) => {
            const att = attByStudent[student.id];
            const attPct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null;
            const marks = marksByStudent[student.id] || [];
            const avgMark = marks.length > 0 ? Math.round(marks.reduce((s: number, m: any) => s + Number(m.marks_obtained), 0) / marks.length) : null;
            const notes = notesByStudent[student.id] || [];
            const cls = classMap[student.classId];

            return (
              <div key={student.id} className="apple-card p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {student.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{student.full_name}</p>
                      {cls && <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-zinc-300 text-xs">{cls.name} {cls.section}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {student.email && <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><Mail className="w-3 h-3" />{student.email}</span>}
                      {student.phone && <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><Phone className="w-3 h-3" />{student.phone}</span>}
                    </div>
                  </div>
                  <div className="flex gap-4 flex-shrink-0">
                    {attPct !== null && (
                      <div className="text-center">
                        <p className={`text-lg font-bold ${attPct >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{attPct}%</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Attendance</p>
                      </div>
                    )}
                    {avgMark !== null && (
                      <div className="text-center">
                        <p className={`text-lg font-bold ${avgMark >= 60 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{avgMark}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Avg Marks</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent marks */}
                {marks.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {marks.slice(0, 5).map((m: any, i: number) => {
                      const sub = Array.isArray(m.subjects) ? m.subjects[0] : m.subjects;
                      return (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/50">
                          {sub?.name}: <span className="font-semibold text-slate-900 dark:text-slate-100">{m.marks_obtained}</span> {m.grade && `(${m.grade})`}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Notes */}
                {notes.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {notes.slice(0, 2).map((n: any) => (
                      <div key={n.id} className="flex items-start gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0 ${categoryColor[n.category] || categoryColor.general}`}>{n.category}</span>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{n.note}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <AddNoteForm studentId={student.id} studentName={student.full_name} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
