import { TablePageSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import ReportCardView from "./ui/report-card";

export default async function StudentResultsPage() {
  const { profile } = await getSessionProfile();

  if (!profile || !profile.roles.includes("student")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch marks for this student
  const { data: standardMarks } = await supabase
    .from("marks")
    .select("exam_id, exams(id, name, start_date, end_date), subjects(id, name), marks_obtained, grade, remarks")
    .eq("student_id", profile.id);

  const marksData = standardMarks || [];
  
  // Extract unique exams
  const examMap = new Map();
  marksData.forEach(m => {
     if (m.exams && !examMap.has(m.exam_id)) {
        examMap.set(m.exam_id, m.exams);
     }
  });
  const exams = Array.from(examMap.values());

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
          My Results
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          View your exam results, report card, and performance analytics.
        </p>
      </div>

      <Suspense fallback={<TablePageSkeleton />}>
         <ReportCardView 
           studentId={profile.id}
           studentName={profile.full_name || profile.email || "Unknown"}
           exams={exams}
           marksData={marksData}
           examSubjects={examSubjects || []}
           gradingSystem={gradingSystem || []}
         />
      </Suspense>
    </div>
  );
}
