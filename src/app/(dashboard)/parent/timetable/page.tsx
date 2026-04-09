import { TimetableSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { getSessionProfile } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import ParentTimetableView from "./ui/parent-timetable-view";

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

export default async function ParentTimetablePage() {
  const { profile } = await getSessionProfile();

  if (!profile || !profile.roles.includes("parent")) {
    redirect("/dashboard");
  }

  const supabase = createServiceClient();

  // Get active year
  const { data: activeYears } = await supabase
    .from("academic_years")
    .select("id")
    .eq("is_active", true);

  const activeYearId = activeYears?.[0]?.id;

  // Fetch children tied to this parent
  const { data: children } = await supabase
    .from("parent_students")
    .select(`
       student_id,
       profiles!parent_students_student_id_fkey(full_name, email)
    `)
    .eq("parent_id", profile.id);

  const studentIds = children?.map(c => c.student_id) || [];

  // Finding classes for these children
  const { data: enrolls } = await supabase
    .from("enrollments")
    .select("student_id, class_id, classes(name, section)")
    .in("student_id", studentIds)
    .eq("academic_year_id", activeYearId || "00000000-0000-0000-0000-000000000000")
    .eq("status", "active");

  const classIds = enrolls?.map(e => e.class_id) || [];

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
  if (classIds.length > 0) {
     const { data } = await supabase.from("timetables").select("*").in("class_id", classIds);
     if (data) timetables = data;
  }

  const teacherIds = Array.from(new Set(timetables.map((t) => t.teacher_id)));
  const { data: teachers } =
    teacherIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", teacherIds)
      : { data: [] };

  // Map children to classes for the UI
  const mappedChildren = (children || []).map(c => {
     const enrollment = enrolls?.find(e => e.student_id === c.student_id);
     const classObj = enrollment?.classes ? (Array.isArray(enrollment.classes) ? enrollment.classes[0] : enrollment.classes) : null;
     return {
        ...c,
        class_id: enrollment?.class_id || null,
        class_name: classObj ? `${classObj.name} ${classObj.section}` : null
     };
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Child Schedules
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Review explicit chronological mappings defining your child&apos;s weekly timeline.
        </p>
      </div>

      <Suspense fallback={<TimetableSkeleton />}>
         <ParentTimetableView 
           childrenData={mappedChildren}
           timeSlots={timeSlots || []}
           timetables={timetables}
           globalSubjects={globalSubjects || []}
           teachers={teachers || []}
         />
      </Suspense>
    </div>
  );
}
