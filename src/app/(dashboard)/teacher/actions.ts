"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/profile";

// ─── Attendance Actions ────────────────────────────────────────────────────

export async function saveAttendance(
  entries: Array<{ studentId: string; classId: string; subjectId?: string; status: string }>,
  date: string
) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const rows = entries.map((e) => ({
    student_id: e.studentId,
    class_id: e.classId,
    subject_id: e.subjectId || null,
    date,
    status: e.status,
    marked_by: profile.id,
  }));

  const { error } = await supabase
    .from("attendance")
    .upsert(rows, { onConflict: "student_id,class_id,subject_id,date" });

  if (error) return { success: false, error: error.message };

  revalidatePath("/teacher/attendance");
  revalidatePath("/teacher");
  return { success: true };
}

// ─── Marks Actions ─────────────────────────────────────────────────────────

export async function saveMarks(
  entries: Array<{ examId: string; studentId: string; subjectId: string; marksObtained: number; remarks?: string }>,
  gradingSystem: Array<{ min_percentage: number; max_percentage: number; grade: string }>
) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  // Get max marks for each exam subject
  const examIds = [...new Set(entries.map((e) => e.examId))];
  const subjectIds = [...new Set(entries.map((e) => e.subjectId))];
  const { data: examSubjects } = await supabase
    .from("exam_subjects")
    .select("exam_id, subject_id, max_marks")
    .in("exam_id", examIds)
    .in("subject_id", subjectIds);

  const maxMarksMap: Record<string, number> = {};
  (examSubjects || []).forEach((es) => {
    maxMarksMap[`${es.exam_id}-${es.subject_id}`] = Number(es.max_marks);
  });

  const rows = entries.map((e) => {
    const maxMarks = maxMarksMap[`${e.examId}-${e.subjectId}`] || 100;
    const pct = (e.marksObtained / maxMarks) * 100;
    const gradeEntry = gradingSystem.find((g) => pct >= g.min_percentage && pct <= g.max_percentage);
    return {
      exam_id: e.examId,
      student_id: e.studentId,
      subject_id: e.subjectId,
      marks_obtained: e.marksObtained,
      grade: gradeEntry?.grade || null,
      remarks: e.remarks || null,
    };
  });

  const { error } = await supabase
    .from("marks")
    .upsert(rows, { onConflict: "exam_id,student_id,subject_id" });

  if (error) return { success: false, error: error.message };

  revalidatePath("/teacher/marks");
  revalidatePath("/teacher");
  return { success: true };
}

// ─── Lesson Plan Actions ───────────────────────────────────────────────────

export async function createLessonPlan(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const classId = String(formData.get("class_id") ?? "").trim();
  const subjectId = String(formData.get("subject_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const objectives = String(formData.get("objectives") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const resources = String(formData.get("resources") ?? "").trim();
  const homework = String(formData.get("homework") ?? "").trim();
  const planDate = String(formData.get("plan_date") ?? "").trim();
  const durationMinutes = parseInt(String(formData.get("duration_minutes") ?? "45"));

  if (!classId || !subjectId || !title || !planDate) {
    return { success: false, error: "Class, subject, title, and date are required" };
  }

  const { error } = await supabase.from("lesson_plans").insert({
    teacher_id: profile.id,
    class_id: classId,
    subject_id: subjectId,
    title,
    description,
    objectives,
    content,
    resources,
    homework,
    plan_date: planDate,
    duration_minutes: durationMinutes,
    status: "published",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/teacher/lesson-plans");
  revalidatePath("/teacher");
  return { success: true };
}

export async function updateLessonPlanStatus(planId: string, status: "draft" | "published" | "completed") {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const { error } = await supabase
    .from("lesson_plans")
    .update({ status })
    .eq("id", planId)
    .eq("teacher_id", profile.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/teacher/lesson-plans");
  return { success: true };
}

// ─── Assignment Actions ────────────────────────────────────────────────────

export async function createAssignment(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const classId = String(formData.get("class_id") ?? "").trim();
  const subjectId = String(formData.get("subject_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const maxMarks = parseFloat(String(formData.get("max_marks") ?? "100"));
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const type = String(formData.get("type") ?? "homework");

  if (!classId || !subjectId || !title || !dueDate) {
    return { success: false, error: "Class, subject, title, and due date are required" };
  }

  const { error } = await supabase.from("assignments").insert({
    teacher_id: profile.id,
    class_id: classId,
    subject_id: subjectId,
    title,
    description,
    instructions,
    max_marks: maxMarks,
    due_date: dueDate,
    type,
    status: "active",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/teacher/assignments");
  revalidatePath("/teacher");
  return { success: true };
}

export async function gradeSubmission(submissionId: string, marksObtained: number, feedback: string) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const { error } = await supabase
    .from("assignment_submissions")
    .update({ marks_obtained: marksObtained, feedback, status: "graded" })
    .eq("id", submissionId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/teacher/assignments");
  return { success: true };
}

// ─── Notice Actions ────────────────────────────────────────────────────────

export async function createNotice(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const classId = String(formData.get("class_id") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal");
  const expiresAt = String(formData.get("expires_at") ?? "").trim() || null;

  if (!title || !content) return { success: false, error: "Title and content are required" };

  const { error } = await supabase.from("class_notices").insert({
    teacher_id: profile.id,
    class_id: classId,
    title,
    content,
    priority,
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    is_active: true,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/teacher/notices");
  revalidatePath("/teacher");
  return { success: true };
}

// ─── Teacher Note Actions ──────────────────────────────────────────────────

export async function addTeacherNote(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const studentId = String(formData.get("student_id") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const category = String(formData.get("category") ?? "general");

  if (!studentId || !note) return { success: false, error: "Student and note are required" };

  const { error } = await supabase.from("teacher_notes").insert({
    teacher_id: profile.id,
    student_id: studentId,
    note,
    category,
    is_private: true,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/teacher/students");
  return { success: true };
}
