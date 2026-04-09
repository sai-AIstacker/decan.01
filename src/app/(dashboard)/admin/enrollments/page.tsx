import { TablePageSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSessionProfile, canConfigureSchool } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import EnrollmentsManager from "./ui/enrollments-manager";

export const dynamic = "force-dynamic";

export default async function EnrollmentsPage() {
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

  const activeYearId = activeYears && activeYears.length > 0 ? activeYears[0].id : null;

  // We fetch enrollments strictly in the active year initially
  const { data: enrollmentsRaw } = await supabase
    .from("enrollments")
    .select("*")
    .eq("academic_year_id", activeYearId || "00000000-0000-0000-0000-000000000000")
    .order("created_at", { ascending: false });

  const classIds = Array.from(new Set((enrollmentsRaw || []).map((e) => e.class_id)));
  const studentIds = Array.from(new Set((enrollmentsRaw || []).map((e) => e.student_id)));
  const [{ data: classRows }, { data: studentProfiles }] = await Promise.all([
    classIds.length > 0
      ? supabase.from("classes").select("id, name, section").in("id", classIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; section: string }> }),
    studentIds.length > 0
      ? supabase.from("profiles").select("id, full_name, email").in("id", studentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string | null }> }),
  ]);

  const classMap = new Map((classRows || []).map((c) => [c.id, c]));
  const studentMap = new Map((studentProfiles || []).map((p) => [p.id, p]));
  const enrollments = (enrollmentsRaw || []).map((e) => ({
    ...e,
    classes: classMap.get(e.class_id) || null,
    profiles: studentMap.get(e.student_id)
      ? { full_name: studentMap.get(e.student_id)?.full_name ?? null, email: studentMap.get(e.student_id)?.email ?? null }
      : null,
  }));

  // Fetch dependency lists for dropdowns
  const { data: classes } = await supabase.from("classes").select("*").eq("academic_year_id", activeYearId || "00000000-0000-0000-0000-000000000000").order("name");
  
  const { fetchProfilesByRole } = await import("@/lib/supabase/queries");
  const students = await fetchProfilesByRole(supabase, "student");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Student Enrollments
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Enroll students into specific classes and manage their active statuses.
        </p>
      </div>

      <Suspense fallback={<TablePageSkeleton />}>
        <EnrollmentsManager 
          initialEnrollments={enrollments || []} 
          availableClasses={classes || []}
          availableStudents={students || []}
          activeYearId={activeYearId}
        />
      </Suspense>
    </div>
  );
}
