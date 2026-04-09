import { TablePageSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import ParentAttendanceView from "./ui/parent-attendance-view";

export default async function ParentAttendancePage() {
  const { profile } = await getSessionProfile();

  if (!profile || !profile.roles.includes("parent")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch children tied to this parent
  const { data: children } = await supabase
    .from("parent_students")
    .select(`
       student_id,
       profiles!parent_students_student_id_fkey(full_name, email)
    `)
    .eq("parent_id", profile.id);

  const studentIds = children?.map(c => c.student_id) || [];
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const fromDate = ninetyDaysAgo.toISOString().split("T")[0];

  // Fetch only children's attendance
  let attendance = null;
  if (studentIds.length > 0) {
    const { data, error } = await supabase
      .from("attendance")
      .select(`
        *,
        classes (name, section),
        subjects (name),
        profiles!attendance_student_id_fkey(full_name, email)
      `)
      .in("student_id", studentIds)
      .gte("date", fromDate)
      .order("date", { ascending: false });
      
    attendance = data;
    if (error) console.error("Error fetching parent attendance", error);
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Child Attendance Logs
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Monitor tracking history and attendance rates for your connected students.
        </p>
      </div>

      <Suspense fallback={<TablePageSkeleton />}>
         <ParentAttendanceView attendanceData={attendance || []} childrenData={children || []} />
      </Suspense>
    </div>
  );
}
