import { TimetableSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { getSessionProfile } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import StudentTimetableView from "./ui/student-timetable-view";

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase admin credentials");
  }
  return createAdminClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export default async function StudentTimetablePage() {
  const { profile } = await getSessionProfile();

  if (!profile || !profile.roles.includes("student")) {
    redirect("/dashboard");
  }

  const supabase = createServiceClient();

  // Get active year
  const { data: activeYears } = await supabase
    .from("academic_years")
    .select("id")
    .eq("is_active", true);

  const activeYearId = activeYears?.[0]?.id;

  // Find their class
  const { data: enrolls } = await supabase
    .from("enrollments")
    .select("class_id, classes(name, section)")
    .eq("student_id", profile.id)
    .eq("academic_year_id", activeYearId || "00000000-0000-0000-0000-000000000000")
    .eq("status", "active")
    .limit(1);

  const myClassId = enrolls?.[0]?.class_id;

  const { data: timeSlots } = await supabase.from("time_slots").select("*").order("order_index");
  
  const { data: globalSubjects } = await supabase.from("subjects").select("id, name, code");
  
  let timetables: Array<{
    id: string;
    class_id: string;
    subject_id: string;
    teacher_id: string;
    day_of_week: number;
    time_slot_id: string;
  }> = [];
  if (myClassId) {
     const { data } = await supabase.from("timetables").select("*").eq("class_id", myClassId);
     if (data) timetables = data;
  }

  const teacherIds = Array.from(new Set(timetables.map((t) => t.teacher_id)));
  const { data: teachers } =
    teacherIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", teacherIds)
      : { data: [] };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Class Schedule
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Your explicitly mapped logical timetable.
        </p>
      </div>

      <Suspense fallback={<TimetableSkeleton />}>
         {myClassId ? (
            <StudentTimetableView 
              timeSlots={timeSlots || []}
              timetables={timetables}
              globalSubjects={globalSubjects || []}
              teachers={teachers || []}
            />
         ) : (
            <div className="p-8 text-center bg-white dark:bg-black apple-card text-zinc-500">
               You are not currently enrolled in any active class block this year.
            </div>
         )}
      </Suspense>
    </div>
  );
}
