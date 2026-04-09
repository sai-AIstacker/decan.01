import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FileText, ChevronRight, Plus, CheckCircle2, Clock, Edit } from "lucide-react";
import Link from "next/link";
import { CreateLessonPlanForm } from "./ui/create-lesson-plan-form";
import { UpdatePlanStatusButton } from "./ui/update-plan-status-button";

export default async function LessonPlansPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { profile } = await getSessionProfile();
  if (!profile || !hasRole(profile.roles, "teacher")) redirect("/dashboard");

  const supabase = await createClient();
  const params: Record<string, string | undefined> = await searchParams ?? {};
  const statusFilter = params.status || "all";

  const [{ data: plans }, { data: homeroomClasses }, { data: subjectLinks }] = await Promise.all([
    supabase.from("lesson_plans").select("*, classes(name,section), subjects(name)").eq("teacher_id", profile.id).order("plan_date", { ascending: false }),
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
    if (cls && sub) {
      if (!subjectsByClass[cls.id]) subjectsByClass[cls.id] = [];
      subjectsByClass[cls.id].push(sub);
    }
  });

  const allPlans = (plans || []) as any[];
  const filtered = statusFilter === "all" ? allPlans : allPlans.filter((p) => p.status === statusFilter);

  const counts = {
    all: allPlans.length,
    draft: allPlans.filter((p) => p.status === "draft").length,
    published: allPlans.filter((p) => p.status === "published").length,
    completed: allPlans.filter((p) => p.status === "completed").length,
  };

  const statusConfig: Record<string, { color: string; icon: any }> = {
    draft: { color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", icon: Edit },
    published: { color: "bg-blue-100 text-zinc-900 dark:bg-zinc-800 dark:text-blue-300", icon: Clock },
    completed: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/teacher" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Teacher</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Lesson Plans</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              Lesson Plans
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Plan and track your lessons</p>
          </div>
          <CreateLessonPlanForm classes={Object.values(classMap)} subjectsByClass={subjectsByClass} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.all, color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-50 dark:bg-slate-900/50", border: "border-slate-200/60" },
          { label: "Draft", value: counts.draft, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/50", border: "border-slate-200/60" },
          { label: "Published", value: counts.published, color: "text-zinc-900 dark:text-zinc-100 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-blue-950/30", border: "border-zinc-200/60" },
          { label: "Completed", value: counts.completed, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200/60" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden w-fit text-xs">
        {(["all", "draft", "published", "completed"] as const).map((s) => (
          <Link key={s} href={`?status=${s}`} className={`px-3 py-2 font-medium capitalize transition-colors ${statusFilter === s ? "bg-[#1d1d1f] text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            {s} ({counts[s as keyof typeof counts]})
          </Link>
        ))}
      </div>

      {/* Plans List */}
      <div className="apple-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No lesson plans yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">Create your first lesson plan using the button above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((plan: any) => {
              const cls = Array.isArray(plan.classes) ? plan.classes[0] : plan.classes;
              const sub = Array.isArray(plan.subjects) ? plan.subjects[0] : plan.subjects;
              const scfg = statusConfig[plan.status] || statusConfig.draft;
              const StatusIcon = scfg.icon;
              return (
                <div key={plan.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{plan.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {sub?.name} · {cls?.name} {cls?.section} · {plan.plan_date}
                        {plan.duration_minutes && ` · ${plan.duration_minutes} min`}
                      </p>
                      {plan.objectives && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{plan.objectives}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${scfg.color}`}>
                        <StatusIcon className="w-3 h-3" />{plan.status}
                      </span>
                      <UpdatePlanStatusButton planId={plan.id} currentStatus={plan.status} />
                    </div>
                  </div>
                  {plan.homework && (
                    <div className="mt-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Homework: <span className="font-normal">{plan.homework}</span></p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
