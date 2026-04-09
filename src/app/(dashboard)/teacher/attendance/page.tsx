import { TablePageSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import TeacherAttendanceManager from "./ui/teacher-attendance-manager";

export default async function TeacherAttendancePage() {
  const { profile } = await getSessionProfile();

  if (!profile || !profile.roles.includes("teacher")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Get active year
  const { data: activeYears } = await supabase
    .from("academic_years")
    .select("id")
    .eq("is_active", true);

  const activeYearId = activeYears?.[0]?.id;

  // We need all distinct classes the teacher has access to.
  // 1. Homeroom classes (classes.class_teacher_id)
  const { data: homerooms } = await supabase
    .from("classes")
    .select("*, subjects:null")
    .eq("class_teacher_id", profile.id)
    .eq("academic_year_id", activeYearId || "00000000-0000-0000-0000-000000000000");

  // 2. Subject classes (class_subjects.teacher_id)
  const { data: subjectClasses } = await supabase
    .from("class_subjects")
    .select(`
      id, subject_id,
      classes!inner(*),
      subjects!inner(name, code)
    `)
    .eq("teacher_id", profile.id)
    .eq("classes.academic_year_id", activeYearId || "00000000-0000-0000-0000-000000000000");

  // Combine them into generic class scopes
  const teacherScopes: any[] = [];
  
  if (homerooms) {
    homerooms.forEach(hr => {
      teacherScopes.push({
        classId: hr.id,
        className: `${hr.name} ${hr.section}`,
        subjectId: null,
        subjectName: "Homeroom / General",
        hash: `${hr.id}::null`
      });
    });
  }

  if (subjectClasses) {
    subjectClasses.forEach(sc => {
      const classObj = Array.isArray(sc.classes) ? sc.classes[0] : sc.classes;
      const subObj = Array.isArray(sc.subjects) ? sc.subjects[0] : sc.subjects;
      teacherScopes.push({
        classId: classObj?.id,
        className: `${classObj?.name} ${classObj?.section}`,
        subjectId: sc.subject_id,
        subjectName: subObj?.name,
        hash: `${classObj?.id}::${sc.subject_id}`
      });
    });
  }

  // Fetch Attendance settings for automatic tracking thresholds
  const { data: settings } = await supabase.from("attendance_settings").select("*").single();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Record Attendance
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Capture and publish direct tracking metrics bound to your daily modules.
        </p>
      </div>

      <Suspense fallback={<TablePageSkeleton />}>
         <TeacherAttendanceManager 
           teacherScopes={teacherScopes}
           settings={settings}
           teacherId={profile.id}
         />
      </Suspense>
    </div>
  );
}
