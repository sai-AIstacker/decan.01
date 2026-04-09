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

export async function createExamAdminAction(data: {
  name: string;
  examTypeId: string;
  classId: string;
  academicYearId: string;
  termId: string | null;
  startDate: string;
  endDate: string;
}) {
  const { profile } = await getSessionProfile();
  if (!profile || !canConfigureSchool(profile.roles)) {
    throw new Error("Unauthorized access. School configuration role required.");
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("exams").insert({
    name: data.name.trim(),
    exam_type_id: data.examTypeId,
    class_id: data.classId,
    academic_year_id: data.academicYearId,
    term_id: data.termId,
    start_date: data.startDate,
    end_date: data.endDate,
  });

  if (error) {
    throw new Error(error.message || "Failed to create exam.");
  }

  revalidatePath("/admin/exams");
  return { success: true };
}
