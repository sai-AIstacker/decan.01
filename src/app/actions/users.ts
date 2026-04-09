"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSessionProfile, isAdmin } from "@/lib/auth/profile";
import { revalidatePath } from "next/cache";
import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateUrl,
} from "@/lib/validation/form-validators";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase admin credentials");
  }
  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function createUserAdminAction(data: {
  email: string;
  fullName: string;
  phone: string;
  avatarUrl: string;
  password: string;
  roles: string[];
}) {
  const { profile } = await getSessionProfile();
  if (!profile || !isAdmin(profile.roles)) {
    throw new Error("Unauthorized access. Admin privileges required.");
  }

  const { email, fullName, phone, avatarUrl, password, roles } = data;
  const adminClient = createAdminClient();

  if (!validateEmail(email)) {
    throw new Error("Please provide a valid email address.");
  }
  const passwordCheck = validatePassword(password, 8);
  if (!passwordCheck.isValid) {
    throw new Error(passwordCheck.errors[0] ?? "Password is invalid.");
  }
  const phoneCheck = validatePhone(phone);
  if (!phoneCheck.isValid) {
    throw new Error(phoneCheck.error ?? "Phone number is invalid.");
  }
  const avatarCheck = validateUrl(avatarUrl);
  if (!avatarCheck.isValid) {
    throw new Error(avatarCheck.error ?? "Avatar URL is invalid.");
  }

  // 1. Create auth user with admin API to bypass rate limits and email verification
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError) {
    throw new Error(`Failed to create user: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error("User creation succeeded but no user data was returned.");
  }

  const userId = authData.user.id;

  // 2. Upsert profile (a trigger might have inserted it, so we upsert)
  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        phone: phone || null,
        avatar_url: avatarUrl || null,
      },
      { onConflict: "id" }
    );

  if (profileError) {
    throw new Error(`Failed to update profile: ${profileError.message}`);
  }

  // 3. Assign roles
  if (roles.length > 0) {
    const roleInserts = roles.map((roleId) => ({
      user_id: userId,
      role_id: roleId,
    }));
    const { error: roleError } = await adminClient.from("user_roles").insert(roleInserts);

    if (roleError) {
      throw new Error(`Failed to assign roles: ${roleError.message}`);
    }
  }

  revalidatePath("/admin/users");
  return { success: true, userId };
}

export async function updateUserAdminAction(data: {
  userId: string;
  fullName: string;
  phone: string;
  avatarUrl: string;
  roles: string[];
}) {
  const { profile } = await getSessionProfile();
  if (!profile || !isAdmin(profile.roles)) {
    throw new Error("Unauthorized access. Admin privileges required.");
  }

  const { userId, fullName, phone, avatarUrl, roles } = data;
  const adminClient = createAdminClient();

  const phoneCheck = validatePhone(phone);
  if (!phoneCheck.isValid) {
    throw new Error(phoneCheck.error ?? "Phone number is invalid.");
  }
  const avatarCheck = validateUrl(avatarUrl);
  if (!avatarCheck.isValid) {
    throw new Error(avatarCheck.error ?? "Avatar URL is invalid.");
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
      avatar_url: avatarUrl || null,
    })
    .eq("id", userId);

  if (profileError) {
    throw new Error(`Failed to update profile: ${profileError.message}`);
  }

  const { error: deleteRolesError } = await adminClient
    .from("user_roles")
    .delete()
    .eq("user_id", userId);
  if (deleteRolesError) {
    throw new Error(`Failed to reset roles: ${deleteRolesError.message}`);
  }

  if (roles.length > 0) {
    const roleInserts = roles.map((roleId) => ({
      user_id: userId,
      role_id: roleId,
    }));
    const { error: roleInsertError } = await adminClient
      .from("user_roles")
      .insert(roleInserts);
    if (roleInsertError) {
      throw new Error(`Failed to assign roles: ${roleInsertError.message}`);
    }
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUserAdminAction(userId: string) {
  const { profile } = await getSessionProfile();
  if (!profile || !isAdmin(profile.roles)) {
    throw new Error("Unauthorized access. Admin privileges required.");
  }

  const adminClient = createAdminClient();

  const { error: roleDeleteError } = await adminClient
    .from("user_roles")
    .delete()
    .eq("user_id", userId);
  if (roleDeleteError) {
    throw new Error(`Failed to delete user roles: ${roleDeleteError.message}`);
  }

  const { error: profileDeleteError } = await adminClient
    .from("profiles")
    .delete()
    .eq("id", userId);
  if (profileDeleteError) {
    throw new Error(`Failed to delete profile: ${profileDeleteError.message}`);
  }

  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    throw new Error(`Failed to delete auth account: ${authDeleteError.message}`);
  }

  revalidatePath("/admin/users");
  return { success: true };
}
