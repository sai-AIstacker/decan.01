import { TablePageSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import ParentResultsManager from "./ui/parent-results-manager";

export default async function ParentResultsPage() {
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

  // Fetch marks for all linked children
  let marksData: any[] = [];
  if (studentIds.length > 0) {
    const { data } = await supabase
      .from("marks")
      .select("exam_id, student_id, exams(id, name, start_date, end_date), subjects(id, name), marks_obtained, grade, remarks")
      .in("student_id", studentIds);
    marksData = data || [];
  }
  
  const { data: examSubjects } = await supabase.from("exam_subjects").select("*");

  // Fetch grading system for charts
  const { data: gradingSystem } = await supabase
    .from("grading_system")
    .select("*")
    .order("min_percentage", { ascending: false });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Child&apos;s Report Card
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          View your child&apos;s exam results, grades, and performance analytics.
        </p>
      </div>

      <Suspense fallback={<TablePageSkeleton />}>
         <ParentResultsManager 
           childrenData={children || []}
           marksData={marksData}
           examSubjects={examSubjects || []}
           gradingSystem={gradingSystem || []}
         />
      </Suspense>
    </div>
  );
}
