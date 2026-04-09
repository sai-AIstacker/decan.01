"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSessionProfile, canConfigureSchool } from "@/lib/auth/profile";
import { revalidatePath } from "next/cache";

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

export async function createAcademicYearAdminAction(data: {
  name: string;
  startDate: string;
  endDate: string;
}) {
  const { profile } = await getSessionProfile();
  if (!profile || !canConfigureSchool(profile.roles)) {
    throw new Error("Unauthorized access. School configuration role required.");
  }

  const adminClient = createAdminClient();
  const payload = {
    name: data.name.trim(),
    start_date: data.startDate,
    end_date: data.endDate,
    is_active: false,
  };

  const { data: created, error } = await adminClient
    .from("academic_years")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to create academic year.");
  }

  revalidatePath("/admin/academic-years");
  revalidatePath("/admin/classes");
  return created;
}

export async function activateAcademicYearAdminAction(academicYearId: string) {
  const { profile } = await getSessionProfile();
  if (!profile || !canConfigureSchool(profile.roles)) {
    throw new Error("Unauthorized access. School configuration role required.");
  }

  const adminClient = createAdminClient();

  const { error: resetError } = await adminClient
    .from("academic_years")
    .update({ is_active: false })
    .eq("is_active", true);
  if (resetError) {
    throw new Error(resetError.message || "Failed to reset active year.");
  }

  const { error: activateError } = await adminClient
    .from("academic_years")
    .update({ is_active: true })
    .eq("id", academicYearId);
  if (activateError) {
    throw new Error(activateError.message || "Failed to activate academic year.");
  }

  revalidatePath("/admin/academic-years");
  revalidatePath("/admin/classes");
  return { success: true };
}
