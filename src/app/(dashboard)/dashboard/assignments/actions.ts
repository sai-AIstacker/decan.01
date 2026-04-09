"use server";

import { revalidatePath } from "next/cache";
import { canConfigureSchool, getSessionProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { getDatabaseErrorMessage } from "@/lib/validation/form-validators";

/**
 * Ensure the current user has permission to configure assignments
 */
async function ensureConfigurator() {
  const { profile } = await getSessionProfile();
  const isConfigurator = canConfigureSchool(profile?.roles);

  if (!isConfigurator) {
    throw new Error("Unauthorized: You do not have permission to configure assignments.");
  }

  return true;
}

/**
 * Validate that both class_id and teacher_id are provided and non-empty
 */
function validateAssignmentData(classId: string, teacherId: string, field: string = "IDs") {
  if (!classId || !teacherId) {
    throw new Error(`${field} are required to complete this assignment.`);
  }
}

/**
 * Assign a teacher to a class
 * Prevents duplicate assignments with upsert
 */
export async function assignTeacher(formData: FormData) {
  try {
    // Check authorization
    await ensureConfigurator();

    // Validate inputs
    const classId = String(formData.get("class_id") ?? "").trim();
    const teacherId = String(formData.get("teacher_id") ?? "").trim();

    validateAssignmentData(classId, teacherId, "Class and Teacher");

    const supabase = await createClient();

    const { error } = await supabase.from("class_teachers").upsert(
      { class_id: classId, teacher_id: teacherId },
      { onConflict: "class_id,teacher_id" }
    );

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard/assignments");
    return { success: true, message: "Teacher assigned successfully." };
  } catch (e: any) {
    const errorMsg = getDatabaseErrorMessage(e) || e.message || "Failed to assign teacher.";
    console.error("assignTeacher error:", errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Unassign a teacher from a class
 */
export async function unassignTeacher(formData: FormData) {
  try {
    // Check authorization
    await ensureConfigurator();

    // Validate inputs
    const classId = String(formData.get("class_id") ?? "").trim();
    const teacherId = String(formData.get("teacher_id") ?? "").trim();

    validateAssignmentData(classId, teacherId, "Class and Teacher");

    const supabase = await createClient();

    const { error } = await supabase
      .from("class_teachers")
      .delete()
      .eq("class_id", classId)
      .eq("teacher_id", teacherId);

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard/assignments");
    return { success: true, message: "Teacher unassigned successfully." };
  } catch (e: any) {
    const errorMsg = getDatabaseErrorMessage(e) || e.message || "Failed to unassign teacher.";
    console.error("unassignTeacher error:", errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Assign a student to a class
 * Prevents duplicate enrollments with upsert
 */
export async function assignStudent(formData: FormData) {
  try {
    // Check authorization
    await ensureConfigurator();

    // Validate inputs
    const classId = String(formData.get("class_id") ?? "").trim();
    const studentId = String(formData.get("student_id") ?? "").trim();

    validateAssignmentData(classId, studentId, "Class and Student");

    const supabase = await createClient();

    const { error } = await supabase.from("class_students").upsert(
      { class_id: classId, student_id: studentId },
      { onConflict: "class_id,student_id" }
    );

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard/assignments");
    return { success: true, message: "Student assigned successfully." };
  } catch (e: any) {
    const errorMsg = getDatabaseErrorMessage(e) || e.message || "Failed to assign student.";
    console.error("assignStudent error:", errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Unassign a student from a class
 */
export async function unassignStudent(formData: FormData) {
  try {
    // Check authorization
    await ensureConfigurator();

    // Validate inputs
    const classId = String(formData.get("class_id") ?? "").trim();
    const studentId = String(formData.get("student_id") ?? "").trim();

    validateAssignmentData(classId, studentId, "Class and Student");

    const supabase = await createClient();

    const { error } = await supabase
      .from("class_students")
      .delete()
      .eq("class_id", classId)
      .eq("student_id", studentId);

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard/assignments");
    return { success: true, message: "Student unassigned successfully." };
  } catch (e: any) {
    const errorMsg = getDatabaseErrorMessage(e) || e.message || "Failed to unassign student.";
    console.error("unassignStudent error:", errorMsg);
    throw new Error(errorMsg);
  }
}
