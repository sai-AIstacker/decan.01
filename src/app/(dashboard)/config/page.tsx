import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AppConfigDashboardPage() {
  const { profile } = await getSessionProfile();

  if (!profile || (!hasRole(profile.roles, "app_config") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">App Configuration</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Structure scheduling, semesters, and system defaults.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/classes"
          className="block rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
        >
          <h2 className="font-medium text-foreground">Classes Layout</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Initialize and structure core class blocks for the year.
          </p>
        </Link>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="font-medium text-foreground">Terms & Scheduling</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Establish the duration and pacing of the academic calendar.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="font-medium text-foreground">System Webhooks</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Configure integrations with learning and accounting tools.
          </p>
        </div>
      </div>
    </div>
  );
}
