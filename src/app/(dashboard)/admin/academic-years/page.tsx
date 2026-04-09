import { TablePageSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, canConfigureSchool } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import AcademicYearsManager from "./ui/academic-years-manager";

export default async function AcademicYearsPage() {
  const { profile } = await getSessionProfile();

  if (!profile || !canConfigureSchool(profile.roles)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch all academic years
  const { data: years, error } = await supabase
    .from("academic_years")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Error fetching academic years:", error);
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Academic Years
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Manage the baseline operational years for the institution.
        </p>
      </div>

      <Suspense fallback={<TablePageSkeleton />}>
        <AcademicYearsManager initialYears={years || []} />
      </Suspense>
    </div>
  );
}
