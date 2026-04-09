import { TimetableSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSessionProfile, canConfigureSchool } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import TimetableManager from "./ui/timetable-manager";

export default async function TimetablePage() {
  const { profile } = await getSessionProfile();

  if (!profile || !canConfigureSchool(profile.roles)) {
    redirect("/dashboard");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase admin credentials");
  }
  const supabase = createAdminClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Get active year
  const { data: activeYears } = await supabase
    .from("academic_years")
    .select("id")
    .eq("is_active", true);

  const activeYearId = activeYears?.[0]?.id;

  // Global Context Dependencies 
  const { data: timeSlots } = await supabase.from("time_slots").select("*").order("order_index");
  
  const { data: allClasses } = await supabase
    .from("classes")
    .select("id, name, section, academic_year_id")
    .order("name");
  const classesInActiveYear =
    activeYearId && allClasses
      ? allClasses.filter((c: any) => c.academic_year_id === activeYearId)
      : [];
  const classes = (classesInActiveYear && classesInActiveYear.length > 0)
    ? classesInActiveYear.map(({ id, name, section }: any) => ({ id, name, section }))
    : (allClasses || []).map(({ id, name, section }: any) => ({ id, name, section }));

  // We only really want subjects assigned to a class via class_subjects, 
  // but for a Master schedule we might select from global subjects and validate.
  const { data: globalSubjects } = await supabase.from("subjects").select("id, name, code");
  
  // Actually, 'Subject must exist in class_subjects mapping' per prompt:
  // We'll fetch class_subjects globally so UI can filter permitted combinations
  const { data: mappedSubjects } = await supabase
    .from("class_subjects")
    .select("id, class_id, subject_id, teacher_id");

  const { fetchProfilesByRole } = await import("@/lib/supabase/queries");
  const teachers = await fetchProfilesByRole(supabase, "teacher");

  const { data: allTimetables } = await supabase
    .from("timetables")
    .select("*");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Master Scheduling Matrix
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Configure physical timelines resolving explicit double booking constraints accurately.
        </p>
      </div>

      <Suspense fallback={<TimetableSkeleton />}>
         <TimetableManager 
           timeSlots={timeSlots || []}
           classes={classes || []}
           globalSubjects={globalSubjects || []}
           mappedSubjects={mappedSubjects || []}
           teachers={teachers || []}
           initialTimetables={allTimetables || []}
         />
      </Suspense>
    </div>
  );
}
