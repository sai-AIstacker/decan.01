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

export async function createEnrollmentAdminAction(data: {
  studentId: string;
  classId: string;
  academicYearId: string;
  status: "active" | "transferred" | "graduated";
}) {
  const { profile } = await getSessionProfile();
  if (!profile || !canConfigureSchool(profile.roles)) {
    throw new Error("Unauthorized access. School configuration role required.");
  }

  const adminClient = createAdminClient();

  const { data: existing, error: existingError } = await adminClient
    .from("enrollments")
    .select("id")
    .eq("student_id", data.studentId)
    .eq("academic_year_id", data.academicYearId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || "Failed to verify existing enrollment.");
  }

  const fetchEnrollmentById = async (id: string) => {
    const { data: enrollment, error: fetchError } = await adminClient
      .from("enrollments")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchError || !enrollment) {
      throw new Error(fetchError?.message || "Failed to load enrollment after save.");
    }

    const [{ data: cls }, { data: studentProfile }] = await Promise.all([
      adminClient
        .from("classes")
        .select("id, name, section")
        .eq("id", enrollment.class_id)
        .maybeSingle(),
      adminClient
        .from("profiles")
        .select("full_name, email")
        .eq("id", enrollment.student_id)
        .maybeSingle(),
    ]);

    return {
      ...enrollment,
      classes: cls ?? null,
      profiles: studentProfile ?? null,
    };
  };

  if (existing?.id) {
    const { error: updateError } = await adminClient
      .from("enrollments")
      .update({
        class_id: data.classId,
        status: data.status,
      })
      .eq("id", existing.id);
    if (updateError) {
      throw new Error(updateError.message || "Failed to update existing enrollment.");
    }
    const enrollment = await fetchEnrollmentById(existing.id);
    revalidatePath("/admin/enrollments");
    return { success: true, updatedExisting: true, enrollment };
  }

  const { data: inserted, error: insertError } = await adminClient
    .from("enrollments")
    .insert({
      student_id: data.studentId,
      class_id: data.classId,
      academic_year_id: data.academicYearId,
      status: data.status,
    })
    .select("id")
    .single();
  if (insertError) {
    throw new Error(insertError.message || "Failed to create enrollment.");
  }
  const enrollment = await fetchEnrollmentById(inserted.id);

  revalidatePath("/admin/enrollments");
  return { success: true, updatedExisting: false, enrollment };
}

export async function updateEnrollmentAdminAction(data: {
  enrollmentId: string;
  classId: string;
  status: "active" | "transferred" | "graduated";
}) {
  const { profile } = await getSessionProfile();
  if (!profile || !canConfigureSchool(profile.roles)) {
    throw new Error("Unauthorized access. School configuration role required.");
  }

  const adminClient = createAdminClient();
  const fetchEnrollmentById = async (id: string) => {
    const { data: enrollment, error: fetchError } = await adminClient
      .from("enrollments")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchError || !enrollment) {
      throw new Error(fetchError?.message || "Failed to load enrollment after update.");
    }
    const [{ data: cls }, { data: studentProfile }] = await Promise.all([
      adminClient
        .from("classes")
        .select("id, name, section")
        .eq("id", enrollment.class_id)
        .maybeSingle(),
      adminClient
        .from("profiles")
        .select("full_name, email")
        .eq("id", enrollment.student_id)
        .maybeSingle(),
    ]);
    return {
      ...enrollment,
      classes: cls ?? null,
      profiles: studentProfile ?? null,
    };
  };
  const { error } = await adminClient
    .from("enrollments")
    .update({
      class_id: data.classId,
      status: data.status,
    })
    .eq("id", data.enrollmentId);

  if (error) {
    throw new Error(error.message || "Failed to update enrollment.");
  }
  const enrollment = await fetchEnrollmentById(data.enrollmentId);

  revalidatePath("/admin/enrollments");
  return { success: true, enrollment };
}

export async function deleteEnrollmentAdminAction(enrollmentId: string) {
  const { profile } = await getSessionProfile();
  if (!profile || !canConfigureSchool(profile.roles)) {
    throw new Error("Unauthorized access. School configuration role required.");
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("enrollments").delete().eq("id", enrollmentId);
  if (error) {
    throw new Error(error.message || "Failed to delete enrollment.");
  }

  revalidatePath("/admin/enrollments");
  return { success: true };
}
