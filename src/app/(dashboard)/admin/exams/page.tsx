import { TablePageSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSessionProfile, canConfigureSchool } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import ExamManager from "./ui/exam-manager";

export const dynamic = "force-dynamic";

export default async function AdminExamsPage() {
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

  const { data: activeYears } = await supabase
    .from("academic_years")
    .select("id")
    .eq("is_active", true);

  const activeYearId = activeYears?.[0]?.id;

  const { data: examTypes } = await supabase.from("exam_types").select("*");
  const { data: terms } = await supabase.from("terms").select("*").eq("academic_year_id", activeYearId || "00000000-0000-0000-0000-000000000000");
  const { data: classes } = await supabase.from("classes").select("id, name, section").eq("academic_year_id", activeYearId || "00000000-0000-0000-0000-000000000000");
  const { data: subjects } = await supabase.from("subjects").select("id, name, code");

  // Fetch Exams in the active year
  const { data: exams } = await supabase
    .from("exams")
    .select(`
      *,
      exam_types(name),
      classes(name, section),
      terms(name)
    `)
    .eq("academic_year_id", activeYearId || "00000000-0000-0000-0000-000000000000")
    .order("start_date", { ascending: false });

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-[var(--foreground)]">Exam Management</h1>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
          Create exams, configure subjects with marks limits, and schedule exam dates.
        </p>
      </div>

      <Suspense fallback={<TablePageSkeleton />}>
         <ExamManager 
            initialExams={exams || []}
            examTypes={examTypes || []}
            terms={terms || []}
            classes={classes || []}
            subjects={subjects || []}
            activeYearId={activeYearId}
         />
      </Suspense>
    </div>
  );
}
