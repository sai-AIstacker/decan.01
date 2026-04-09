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

export async function createClassAdminAction(data: {
  name: string;
  section: string;
  academicYearId: string;
  classTeacherId: string | null;
}) {
  const { profile } = await getSessionProfile();
  if (!profile || !canConfigureSchool(profile.roles)) {
    throw new Error("Unauthorized access. School configuration role required.");
  }

  const adminClient = createAdminClient();
  const payload = {
    name: data.name.trim(),
    section: data.section.trim(),
    academic_year_id: data.academicYearId,
    class_teacher_id: data.classTeacherId,
  };

  const { data: created, error } = await adminClient
    .from("classes")
    .insert(payload)
    .select("id, name, section, academic_year_id, class_teacher_id")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to create class.");
  }

  revalidatePath("/admin/classes");
  return created;
}

export async function toggleClassActiveAdminAction(classId: string, isActive: boolean) {
  const { profile } = await getSessionProfile();
  if (!profile || !canConfigureSchool(profile.roles)) {
    throw new Error("Unauthorized access. School configuration role required.");
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("classes")
    .update({ is_active: isActive })
    .eq("id", classId);

  if (error) {
    throw new Error(error.message || "Failed to update class status.");
  }

  revalidatePath("/admin/classes");
  revalidatePath("/teacher");
  revalidatePath("/dashboard/classes");
  return { success: true };
}

export async function deleteClassAdminAction(classId: string) {
  const { profile } = await getSessionProfile();
  if (!profile || !canConfigureSchool(profile.roles)) {
    throw new Error("Unauthorized access. School configuration role required.");
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("classes").delete().eq("id", classId);
  if (error) {
    throw new Error(error.message || "Failed to delete class.");
  }

  revalidatePath("/admin/classes");
  return { success: true };
}
