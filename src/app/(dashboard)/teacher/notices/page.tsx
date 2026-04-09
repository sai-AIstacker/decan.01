import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Megaphone, ChevronRight } from "lucide-react";
import Link from "next/link";
import { CreateNoticeForm } from "./ui/create-notice-form";

export default async function NoticesPage() {
  const { profile } = await getSessionProfile();
  if (!profile || !hasRole(profile.roles, "teacher")) redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: notices }, { data: homeroomClasses }, { data: subjectLinks }] = await Promise.all([
    supabase.from("class_notices").select("*, classes(name,section)").eq("teacher_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("classes").select("id, name, section").eq("class_teacher_id", profile.id),
    supabase.from("class_subjects").select("class_id, classes(id,name,section)").eq("teacher_id", profile.id),
  ]);

  const classMap: Record<string, any> = {};
  (homeroomClasses || []).forEach((c: any) => { classMap[c.id] = c; });
  (subjectLinks || []).forEach((l: any) => {
    const cls = Array.isArray(l.classes) ? l.classes[0] : l.classes;
    if (cls) classMap[cls.id] = cls;
  });

  const priorityConfig: Record<string, { color: string; border: string }> = {
    urgent: { color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800" },
    high: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
    normal: { color: "bg-blue-100 text-zinc-900 dark:bg-zinc-800 dark:text-blue-300", border: "border-zinc-200 dark:border-blue-800" },
    low: { color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", border: "border-slate-200 dark:border-slate-700" },
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/teacher" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Teacher</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Notices</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              Class Notices
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Post announcements for your classes</p>
          </div>
          <CreateNoticeForm classes={Object.values(classMap)} />
        </div>
      </div>

      {(notices || []).length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-16 text-center">
          <Megaphone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No notices posted yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(notices || []).map((n: any) => {
            const cls = Array.isArray(n.classes) ? n.classes[0] : n.classes;
            const pcfg = priorityConfig[n.priority] || priorityConfig.normal;
            return (
              <div key={n.id} className={`apple-card p-6`}>
                <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${pcfg.color}`}>{n.priority}</span>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{n.title}</h3>
                    {cls && <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-zinc-300 text-xs">{cls.name} {cls.section}</span>}
                    {!n.class_id && <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs">All Classes</span>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    {!n.is_active && <span className="text-xs text-rose-500">Inactive</span>}
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{n.content}</p>
                {n.expires_at && <p className="text-xs text-slate-400 mt-2">Expires: {new Date(n.expires_at).toLocaleDateString("en-IN")}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
