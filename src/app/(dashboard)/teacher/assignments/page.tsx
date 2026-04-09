import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClipboardList, ChevronRight, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { CreateAssignmentForm } from "./ui/create-assignment-form";

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { profile } = await getSessionProfile();
  if (!profile || !hasRole(profile.roles, "teacher")) redirect("/dashboard");

  const supabase = await createClient();
  const params: Record<string, string | undefined> = await searchParams ?? {};
  const statusFilter = params.status || "active";
  const today = new Date().toISOString().split("T")[0];

  const [{ data: assignments }, { data: homeroomClasses }, { data: subjectLinks }] = await Promise.all([
    supabase.from("assignments").select("*, classes(name,section), subjects(name)").eq("teacher_id", profile.id).order("due_date", { ascending: true }),
    supabase.from("classes").select("id, name, section").eq("class_teacher_id", profile.id),
    supabase.from("class_subjects").select("class_id, subject_id, classes(id,name,section), subjects(id,name)").eq("teacher_id", profile.id),
  ]);

  const classMap: Record<string, any> = {};
  (homeroomClasses || []).forEach((c: any) => { classMap[c.id] = c; });
  (subjectLinks || []).forEach((l: any) => {
    const cls = Array.isArray(l.classes) ? l.classes[0] : l.classes;
    if (cls) classMap[cls.id] = cls;
  });
  const subjectsByClass: Record<string, any[]> = {};
  (subjectLinks || []).forEach((l: any) => {
    const cls = Array.isArray(l.classes) ? l.classes[0] : l.classes;
    const sub = Array.isArray(l.subjects) ? l.subjects[0] : l.subjects;
    if (cls && sub) { if (!subjectsByClass[cls.id]) subjectsByClass[cls.id] = []; subjectsByClass[cls.id].push(sub); }
  });

  const allAssignments = (assignments || []) as any[];
  const filtered = statusFilter === "all" ? allAssignments : allAssignments.filter((a) => a.status === statusFilter);

  const counts = {
    all: allAssignments.length,
    active: allAssignments.filter((a) => a.status === "active").length,
    closed: allAssignments.filter((a) => a.status === "closed").length,
    draft: allAssignments.filter((a) => a.status === "draft").length,
  };

  const typeColor: Record<string, string> = {
    homework: "bg-blue-100 text-zinc-900 dark:bg-zinc-800 dark:text-blue-300",
    project: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    test: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    classwork: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    other: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/teacher" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Teacher</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Assignments</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              Assignments
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Create and manage class assignments</p>
          </div>
          <CreateAssignmentForm classes={Object.values(classMap)} subjectsByClass={subjectsByClass} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.all, color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-50 dark:bg-slate-900/50", border: "border-slate-200/60" },
          { label: "Active", value: counts.active, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200/60" },
          { label: "Draft", value: counts.draft, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/50", border: "border-slate-200/60" },
          { label: "Closed", value: counts.closed, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200/60" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden w-fit text-xs">
        {(["active", "draft", "closed", "all"] as const).map((s) => (
          <Link key={s} href={`?status=${s}`} className={`px-3 py-2 font-medium capitalize transition-colors ${statusFilter === s ? "bg-[#1d1d1f] text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            {s} ({counts[s as keyof typeof counts]})
          </Link>
        ))}
      </div>

      {/* Assignments */}
      <div className="apple-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No assignments found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((a: any) => {
              const cls = Array.isArray(a.classes) ? a.classes[0] : a.classes;
              const sub = Array.isArray(a.subjects) ? a.subjects[0] : a.subjects;
              const daysLeft = Math.ceil((new Date(a.due_date).getTime() - Date.now()) / 86400000);
              const isOverdue = daysLeft < 0 && a.status === "active";
              return (
                <div key={a.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeColor[a.type] || typeColor.other}`}>{a.type}</span>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{a.title}</p>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{sub?.name} · {cls?.name} {cls?.section} · Max: {a.max_marks} marks</p>
                      {a.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{a.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-medium ${isOverdue ? "text-rose-600 dark:text-rose-400" : daysLeft <= 2 ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-400"}`}>
                        {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Due today" : daysLeft === 1 ? "Due tomorrow" : `Due in ${daysLeft}d`}
                      </p>
                      <p className="text-xs text-slate-400">{a.due_date}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
