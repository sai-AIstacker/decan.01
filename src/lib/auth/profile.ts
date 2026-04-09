import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile, AppRole } from "@/types/database";

/**
 * Cached per-request. React cache() deduplicates when both
 * layout.tsx and page.tsx call this in the same render pass.
 */
export const getSessionProfile = cache(async (): Promise<{
  userId: string | null;
  profile: Profile | null;
}> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      *,
      user_roles!inner(
        roles!inner(name)
      )
    `)
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return { userId: user.id, profile: null };
  }

  // Transform the data to match Profile type
  const roles: AppRole[] = profile.user_roles.map((ur: any) => ur.roles.name);

  const transformedProfile: Profile = {
    ...profile,
    roles,
  };

  return { userId: user.id, profile: transformedProfile };
});

export function canConfigureSchool(roles: AppRole[] | null | undefined) {
  return roles?.includes("admin") || roles?.includes("app_config");
}

export function hasRole(roles: AppRole[] | null | undefined, role: AppRole) {
  return roles?.includes(role) || false;
}

export function isAdmin(roles: AppRole[] | null | undefined) {
  return hasRole(roles, "admin");
}

export function isOwnerEmail(email: string | null | undefined) {
  if (!email) return false;
  const configured = process.env.OWNER_EMAILS || process.env.COMPANY_OWNER_EMAIL || "";
  const allowed = configured
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
