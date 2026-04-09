import { TablePageSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSessionProfile, canConfigureSchool } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import ClassesManager from "./ui/classes-manager";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const { profile } = await getSessionProfile();
  if (!profile || !canConfigureSchool(profile.roles)) redirect("/dashboard");

  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Only fetch dropdown dependencies — table data is fetched client-side with pagination
  const [{ data: academicYears }, teachers] = await Promise.all([
    supabase.from("academic_years").select("*").order("start_date", { ascending: false }),
    import("@/lib/supabase/queries").then(m => m.fetchProfilesByRole(supabase, "teacher")),
  ]);

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-[var(--foreground)]">Classes Directory</h1>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">Create class rosters and assign homeroom teachers.</p>
      </div>
      <Suspense fallback={<TablePageSkeleton />}>
        <ClassesManager academicYears={academicYears || []} teachers={teachers || []} />
      </Suspense>
    </div>
  );
}
