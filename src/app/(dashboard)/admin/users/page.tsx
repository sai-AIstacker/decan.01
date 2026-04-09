import { TablePageSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, isAdmin } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import UserManagement from "./ui/user-management";

export default async function AdminUsersPage() {
  const { profile } = await getSessionProfile();

  if (!profile || !isAdmin(profile.roles)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch all users with their roles
  const { data: users, error } = await supabase
    .from("profiles")
    .select(`
      *,
      user_roles(
        roles(name)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
  }

  // Fetch all available roles
  const { data: roles } = await supabase
    .from("roles")
    .select("*")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create, edit, and manage user accounts and their roles.
        </p>
      </div>

      <Suspense fallback={<TablePageSkeleton />}>
        <UserManagement
          initialUsers={users || []}
          availableRoles={roles || []}
        />
      </Suspense>
    </div>
  );
}