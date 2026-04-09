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

async function ensureConfigurator() {
  const { profile } = await getSessionProfile();
  if (!profile || !canConfigureSchool(profile.roles)) {
    throw new Error("Unauthorized access. School configuration role required.");
  }
}

function parseConflict(error: { code?: string; message?: string } | null) {
  if (!error) return null;
  if (error.code === "23505") {
    if ((error.message || "").includes("teacher_conflict")) {
      return "Teacher already assigned in another class at this time.";
    }
    if ((error.message || "").includes("class_conflict")) {
      return "Class already has a subject at this time.";
    }
  }
  return error.message || "Database operation failed.";
}

export async function createTimeSlotAdminAction(data: {
  name: string;
  startTime: string;
  endTime: string;
  orderIndex: number;
}) {
  await ensureConfigurator();
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("time_slots").insert({
    name: data.name.trim(),
    start_time: data.startTime,
    end_time: data.endTime,
    order_index: data.orderIndex,
  });
  if (error) throw new Error(error.message || "Failed to create time slot.");
  revalidatePath("/admin/timetable");
  return { success: true };
}

export async function upsertTimetableBlockAdminAction(data: {
  blockId?: string | null;
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;
  timeSlotId: string;
}) {
  await ensureConfigurator();
  const adminClient = createAdminClient();
  if (!data.classId || !data.subjectId || !data.teacherId || !data.timeSlotId) {
    throw new Error("Class, subject, teacher, and time slot are required.");
  }
  if (!Number.isInteger(data.dayOfWeek) || data.dayOfWeek < 0 || data.dayOfWeek > 6) {
    throw new Error("Invalid day selected.");
  }

  // Keep class_subjects aligned so timetable assignment always has a valid mapping.
  const { error: mappingError } = await adminClient.from("class_subjects").upsert(
    {
      class_id: data.classId,
      subject_id: data.subjectId,
      teacher_id: data.teacherId,
    },
    {
      onConflict: "class_id,subject_id",
    },
  );
  if (mappingError) {
    throw new Error(mappingError.message || "Failed to map subject to class.");
  }

  const payload = {
    class_id: data.classId,
    subject_id: data.subjectId,
    teacher_id: data.teacherId,
    day_of_week: data.dayOfWeek,
    time_slot_id: data.timeSlotId,
  };

  const { error } = data.blockId
    ? await adminClient.from("timetables").update(payload).eq("id", data.blockId)
    : await adminClient.from("timetables").insert(payload);

  const conflict = parseConflict(error);
  if (conflict) throw new Error(conflict);

  revalidatePath("/admin/timetable");
  return { success: true };
}

export async function deleteTimetableBlockAdminAction(blockId: string) {
  await ensureConfigurator();
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("timetables").delete().eq("id", blockId);
  if (error) throw new Error(error.message || "Failed to delete timetable block.");
  revalidatePath("/admin/timetable");
  return { success: true };
}

export async function copyTimetableToClassAdminAction(sourceClassId: string, targetClassId: string) {
  await ensureConfigurator();
  const adminClient = createAdminClient();

  const { data: sourceItems, error: sourceError } = await adminClient
    .from("timetables")
    .select("*")
    .eq("class_id", sourceClassId);
  if (sourceError) throw new Error(sourceError.message || "Failed to load source timetable.");
  if (!sourceItems || sourceItems.length === 0) {
    throw new Error("Source class has no timetable.");
  }

  const payloads = sourceItems.map((item) => ({
    class_id: targetClassId,
    subject_id: item.subject_id,
    teacher_id: item.teacher_id,
    day_of_week: item.day_of_week,
    time_slot_id: item.time_slot_id,
  }));

  const { error } = await adminClient.from("timetables").upsert(payloads, {
    onConflict: "class_id,day_of_week,time_slot_id",
  });
  const conflict = parseConflict(error);
  if (conflict) throw new Error(conflict);

  revalidatePath("/admin/timetable");
  return { success: true };
}

export async function moveTimetableBlockAdminAction(blockId: string, dayOfWeek: number, timeSlotId: string) {
  await ensureConfigurator();
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("timetables")
    .update({
      day_of_week: dayOfWeek,
      time_slot_id: timeSlotId,
    })
    .eq("id", blockId);
  const conflict = parseConflict(error);
  if (conflict) throw new Error(conflict);
  revalidatePath("/admin/timetable");
  return { success: true };
}
