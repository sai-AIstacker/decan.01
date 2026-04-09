"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getSessionProfile, isOwnerEmail } from "@/lib/auth/profile";
import { validateEmail, validatePassword } from "@/lib/validation/form-validators";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase admin credentials.");
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createAdminByOwnerAction(data: {
  email: string;
  fullName: string;
  password: string;
}) {
  const { profile } = await getSessionProfile();
  if (!isOwnerEmail(profile?.email)) {
    throw new Error("Unauthorized. Owner access required.");
  }

  const email = data.email.trim().toLowerCase();
  const fullName = data.fullName.trim() || "Administrator";
  const password = data.password;

  if (!validateEmail(email)) {
    throw new Error("Please provide a valid email address.");
  }
  const passwordCheck = validatePassword(password, 8);
  if (!passwordCheck.isValid) {
    throw new Error(passwordCheck.errors[0] ?? "Password is invalid.");
  }

  const adminClient = createAdminClient();

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (authError || !authData.user?.id) {
    throw new Error(authError?.message || "Failed to create auth user.");
  }

  const userId = authData.user.id;

  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      phone: null,
      avatar_url: null,
    },
    { onConflict: "id" }
  );
  if (profileError) {
    throw new Error(`Failed to create profile: ${profileError.message}`);
  }

  const { data: adminRole, error: roleError } = await adminClient
    .from("roles")
    .select("id")
    .eq("name", "admin")
    .single();
  if (roleError || !adminRole?.id) {
    throw new Error('Admin role not found. Ensure migrations created "roles".');
  }

  const { error: userRoleError } = await adminClient
    .from("user_roles")
    .upsert({ user_id: userId, role_id: adminRole.id }, { onConflict: "user_id,role_id" });
  if (userRoleError) {
    throw new Error(`Failed to assign admin role: ${userRoleError.message}`);
  }

  revalidatePath("/owner");
  return { success: true };
}
