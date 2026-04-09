import { TablePageSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, canConfigureSchool } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import AdminResultsManager from "./ui/admin-results-manager";

export default async function AdminResultsPage() {
  const { profile } = await getSessionProfile();

  if (!profile || !canConfigureSchool(profile.roles)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch the active academic year
  const { data: activeYears } = await supabase
    .from("academic_years")
    .select("id")
    .eq("is_active", true);

  const activeYearId = activeYears?.[0]?.id;

  // Fetch all exams in the active year
  const { data: rawExams } = await supabase
    .from("exams")
    .select("id, name, class_id, exam_type_id, start_date, end_date, classes(name, section), exam_types(name)")
    .eq("academic_year_id", activeYearId || "00000000-0000-0000-0000-000000000000")
    .order("start_date", { ascending: false });

  const exams = rawExams || [];

  // Fetch all subjects
  const { data: subjects } = await supabase.from("subjects").select("id, name, code");

  // Fetch all exam subject configurations
  const { data: examSubjects } = await supabase.from("exam_subjects").select("*");

  // Fetch grading system for analytics
  const { data: gradingSystem } = await supabase
    .from("grading_system")
    .select("*")
    .order("min_percentage", { ascending: false });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Examination Results Analytics
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Review school-wide performance, download consolidated results, and analyze class metrics.
        </p>
      </div>

      <Suspense fallback={<TablePageSkeleton />}>
         <AdminResultsManager 
           exams={exams}
           subjects={subjects || []}
           examSubjects={examSubjects || []}
           gradingSystem={gradingSystem || []}
         />
      </Suspense>
    </div>
  );
}
