import { TablePageSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, canConfigureSchool } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import SubjectsManager from "./ui/subjects-manager";

export default async function SubjectsPage() {
  const { profile } = await getSessionProfile();

  if (!profile || !canConfigureSchool(profile.roles)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: subjects, error } = await supabase
    .from("subjects")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching subjects:", error);
  }

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-[var(--foreground)]">Subjects Catalog</h1>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">Manage subjects across the school ecosystem.</p>
      </div>
      <Suspense fallback={<TablePageSkeleton />}>
        <SubjectsManager />
      </Suspense>
    </div>
  );
}
