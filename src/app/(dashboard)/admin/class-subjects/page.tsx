import { TablePageSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSessionProfile, canConfigureSchool } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import ClassSubjectsManager from "./ui/class-subjects-manager";

export default async function ClassSubjectsPage() {
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

  // Fetch classes with fallback: if no classes match active year, use all classes
  const { data: allClasses } = await supabase.from("classes").select("*");
  const classesInActiveYear =
    activeYearId && allClasses
      ? allClasses.filter((c: any) => c.academic_year_id === activeYearId)
      : [];
  const classes = (classesInActiveYear && classesInActiveYear.length > 0)
    ? classesInActiveYear
    : (allClasses || []);
  const classIds = classes.map((c: any) => c.id);

  // Fetch assignments for resolved class set
  const assignmentsQuery = supabase
    .from("class_subjects")
    .select(`
      *,
      classes!inner(id, name, section, academic_year_id),
      subjects!inner(name, code),
      profiles(full_name, email)
    `)
    .order("created_at", { ascending: false });
  const { data: assignments } = classIds.length > 0
    ? await assignmentsQuery.in("class_id", classIds)
    : { data: [] };

  // Fetch dependency lists for dropdowns
  const { data: subjects } = await supabase.from("subjects").select("*").order("name");
  
  const { fetchProfilesByRole } = await import("@/lib/supabase/queries");
  const teachers = await fetchProfilesByRole(supabase, "teacher");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Subject Allocations
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Assign specific subjects and respective faculty directly to class rosters.
        </p>
      </div>

      <Suspense fallback={<TablePageSkeleton />}>
        <ClassSubjectsManager 
          initialAssignments={assignments || []} 
          availableClasses={classes || []}
          availableSubjects={subjects || []}
          availableTeachers={teachers || []}
          hasActiveYear={!!activeYearId}
          activeYearId={activeYearId}
          allowedClassIds={classIds}
        />
      </Suspense>
    </div>
  );
}
