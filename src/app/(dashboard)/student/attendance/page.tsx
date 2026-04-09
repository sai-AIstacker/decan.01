import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import StudentAttendanceView from "./ui/student-attendance-view";
import { Skeleton } from "@/components/ui/skeleton";

function AttendanceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[100px] rounded-2xl" />)}
      </div>
      <Skeleton className="h-[400px] rounded-2xl" />
    </div>
  );
}

export default async function StudentAttendancePage() {
  const { profile } = await getSessionProfile();

  if (!profile || !profile.roles.includes("student")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // ─── OPTIMIZED: scope to last 90 days instead of entire history ──────────
  // Prevents unbounded data transfer as years accumulate. Students see
  // recent records by default — the UI can surface a date-range filter for older data.
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const fromDate = ninetyDaysAgo.toISOString().split("T")[0];

  // Parallel: fetch scoped attendance + total count for display
  const [{ data: attendance }, { count: totalCount }] = await Promise.all([
    supabase
      .from("attendance")
      .select("*, classes(name, section), subjects(name)")
      .eq("student_id", profile.id)
      .gte("date", fromDate)
      .order("date", { ascending: false })
      .limit(90),
    supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .eq("student_id", profile.id),
  ]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          My Attendance
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Showing last 90 days · {totalCount ?? 0} total records
        </p>
      </div>

      <Suspense fallback={<AttendanceSkeleton />}>
        <StudentAttendanceView attendanceData={attendance ?? []} />
      </Suspense>
    </div>
  );
}
