import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetch profiles that have a specific role assigned.
 *
 * The Supabase PostgREST nested inner-join filter
 *   `.select("..., user_roles!inner(roles!inner(name))").eq("user_roles.roles.name", role)`
 * silently returns empty results in many Supabase versions.
 *
 * This helper works around that by:
 *   1. Looking up the role ID from the `roles` table
 *   2. Fetching user IDs from `user_roles` for that role
 *   3. Fetching matching profiles
 */
export async function fetchProfilesByRole(
  supabase: SupabaseClient,
  roleName: string
): Promise<{ id: string; full_name: string; email: string }[]> {
  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (!role) return [];

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role_id", role.id);

  if (!userRoles || userRoles.length === 0) return [];

  const ids = userRoles.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);

  return profiles || [];
}
