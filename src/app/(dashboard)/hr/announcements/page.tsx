import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Megaphone, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { CreateAnnouncementForm } from "./ui/create-announcement-form";

const priorityConfig: Record<string, { label: string; color: string; border: string }> = {
  urgent: { label: "Urgent", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800" },
  high: { label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
  normal: { label: "Normal", color: "bg-blue-100 text-zinc-900 dark:bg-zinc-800 dark:text-blue-300", border: "border-zinc-200 dark:border-blue-800" },
  low: { label: "Low", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", border: "border-slate-200 dark:border-slate-700" },
};

export default async function AnnouncementsPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "hr") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from("hr_announcements")
    .select("*, profiles:published_by(full_name)")
    .order("published_at", { ascending: false });

  const allAnnouncements = (announcements || []) as any[];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/hr" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">HR</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Announcements</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              HR Announcements
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Post notices and updates for all staff</p>
          </div>
          <CreateAnnouncementForm />
        </div>
      </div>

      {allAnnouncements.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-16 text-center">
          <Megaphone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No announcements yet</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">Post your first announcement using the button above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allAnnouncements.map((a: any) => {
            const pcfg = priorityConfig[a.priority] || priorityConfig.normal;
            return (
              <div key={a.id} className={`apple-card p-6`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${pcfg.color}`}>{pcfg.label}</span>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{a.title}</h3>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(a.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    <p className="text-xs text-slate-400">By {a.profiles?.full_name || "HR"}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{a.content}</p>
                {a.expires_at && (
                  <p className="text-xs text-slate-400 mt-3">Expires: {new Date(a.expires_at).toLocaleDateString("en-IN")}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
