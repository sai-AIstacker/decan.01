import { TablePageSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import MarksEntryManager from "./ui/marks-entry-manager";

export default async function TeacherMarksPage() {
  const { profile } = await getSessionProfile();

  if (!profile || !profile.roles.includes("teacher")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: activeYears } = await supabase
    .from("academic_years")
    .select("id")
    .eq("is_active", true);

  const activeYearId = activeYears?.[0]?.id;

  // Fetch exams for the active year
  const { data: rawExams } = await supabase
    .from("exams")
    .select("id, name, class_id, exam_type_id, exam_types(name), classes(name, section)")
    .eq("academic_year_id", activeYearId || "00000000-0000-0000-0000-000000000000");

  const exams = rawExams || [];

  // Homeroom classes for this teacher
  const { data: homerooms } = await supabase.from("classes").select("id").eq("class_teacher_id", profile.id);
  const homeClassIds = homerooms?.map(h => h.id) || [];

  // Specific class-subject assignments
  const { data: specificSubs } = await supabase.from("class_subjects").select("class_id, subject_id").eq("teacher_id", profile.id);

  // All exam-subject mappings
  const { data: examSubs } = await supabase
    .from("exam_subjects")
    .select("*, subjects(name, code)");

  // Filter exams to only those this teacher can access
  const permittedExams = exams.filter(ex => {
     if (homeClassIds.includes(ex.class_id)) return true;
     return specificSubs?.some(ss => ss.class_id === ex.class_id);
  });

  const { data: gradingSystem } = await supabase.from("grading_system").select("*").order("min_percentage", { ascending: false });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Marks Entry
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Enter and update student marks for your assigned exams and subjects.
        </p>
      </div>

      <Suspense fallback={<TablePageSkeleton />}>
         <MarksEntryManager 
           exams={permittedExams}
           examSubjects={examSubs || []}
           gradingSystem={gradingSystem || []}
           homeClassIds={homeClassIds}
           specificSubjects={specificSubs || []}
         />
      </Suspense>
    </div>
  );
}
