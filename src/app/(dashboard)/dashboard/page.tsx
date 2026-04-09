import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/profile";
import type { AppRole } from "@/types/database";
import { ROLE_LABELS } from "@/types/database";

const ROLE_PANELS: Record<
  AppRole,
  { title: string; description: string; href?: string }[]
> = {
  admin: [
    {
      title: "User Management",
      description: "Create users, assign roles, and manage profiles.",
      href: "/admin/users",
    },
    {
      title: "Classes",
      description: "Create and assign teachers and students.",
      href: "/admin/classes",
    },
    {
      title: "Assignments",
      description: "Map teachers and students to classes from one screen.",
      href: "/dashboard/assignments",
    },
  ],
  teacher: [
    {
      title: "My classes",
      description: "Only sections you are assigned to appear here (enforced in the database).",
      href: "/dashboard/classes",
    },
  ],
  student: [
    {
      title: "My classes",
      description: "View your enrolled sections.",
      href: "/dashboard/classes",
    },
  ],
  parent: [
    {
      title: "Children’s classes",
      description: "See classes linked to your students.",
      href: "/dashboard/classes",
    },
  ],
  app_config: [
    {
      title: "Scheduling & structure",
      description: "Configure classes, terms, and assignments (with admin).",
      href: "/admin/classes",
    },
    {
      title: "Assignments",
      description: "Manage class-teacher and class-student links.",
      href: "/dashboard/assignments",
    },
  ],
  accounting: [
    {
      title: "Finance overview",
      description: "Reporting hooks can connect to fees, payroll exports, and ledgers.",
    },
  ],
  hr: [
    {
      title: "Staff records",
      description: "HR workflows: contracts, leave, and compliance (extend schema as needed).",
    },
  ],
};

export default async function DashboardHomePage() {
  const { profile } = await getSessionProfile();

  if (!profile) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/40">
        <h2 className="font-medium text-amber-900 dark:text-amber-100">Profile missing</h2>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
          Your account exists but no profile row was found. Ensure the database migration ran and the
          auth trigger created your profile.
        </p>
      </div>
    );
  }

  // Smart redirect based on primary role
  const roles = profile.roles;
  if (roles.includes("admin")) { const { redirect } = await import("next/navigation"); redirect("/admin"); }
  if (roles.includes("teacher")) { const { redirect } = await import("next/navigation"); redirect("/teacher"); }
  if (roles.includes("student")) { const { redirect } = await import("next/navigation"); redirect("/student"); }
  if (roles.includes("parent")) { const { redirect } = await import("next/navigation"); redirect("/parent"); }
  if (roles.includes("accounting")) { const { redirect } = await import("next/navigation"); redirect("/accounting"); }
  if (roles.includes("hr")) { const { redirect } = await import("next/navigation"); redirect("/hr"); }

  // Collect all panels for user's roles
  const allPanels = profile.roles.flatMap(role => ROLE_PANELS[role] || []);
  // Remove duplicates based on title
  const uniquePanels = allPanels.filter((panel, index, self) =>
    index === self.findIndex(p => p.title === panel.title)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{profile.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          You are signed in with roles: <strong>{profile.roles.map(r => ROLE_LABELS[r]).join(", ")}</strong>.
          Menus and data follow your roles in Supabase Row Level Security.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {uniquePanels.map((p) => (
          <li key={p.title}>
            {p.href ? (
              <Link
                href={p.href}
                className="block h-full rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
              >
                <h2 className="font-medium text-foreground">{p.title}</h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{p.description}</p>
              </Link>
            ) : (
              <div className="h-full rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="font-medium text-foreground">{p.title}</h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{p.description}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
