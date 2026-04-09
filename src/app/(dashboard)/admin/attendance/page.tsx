import { TablePageSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, canConfigureSchool } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import AdminAttendanceManager from "./ui/admin-attendance-manager";

export default async function AdminAttendancePage() {
  const { profile } = await getSessionProfile();

  if (!profile || !canConfigureSchool(profile.roles)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Basic filters to prime the UI
  const { data: classes } = await supabase.from("classes").select("id, name, section").order("name");
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Attendance Ecosystem Logs
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Real-time global tracking parameters.
        </p>
      </div>

      <Suspense fallback={<TablePageSkeleton />}>
         <AdminAttendanceManager availableClasses={classes || []} />
      </Suspense>
    </div>
  );
}
