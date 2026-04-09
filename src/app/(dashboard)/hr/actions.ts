"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/profile";

// ─── Leave Actions ─────────────────────────────────────────────────────────

export async function applyLeave(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const leaveTypeId = String(formData.get("leave_type_id") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const isHalfDay = formData.get("is_half_day") === "true";

  if (!startDate || !endDate || !reason) {
    return { success: false, error: "All fields are required" };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return { success: false, error: "End date cannot be before start date" };

  const totalDays = isHalfDay ? 0.5 : Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;

  const { error } = await supabase.from("leave_requests").insert({
    user_id: profile.id,
    leave_type_id: leaveTypeId || null,
    start_date: startDate,
    end_date: endDate,
    reason,
    total_days: totalDays,
    is_half_day: isHalfDay,
    status: "pending",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/hr/leave");
  revalidatePath("/hr");
  return { success: true };
}

export async function updateLeaveStatus(
  leaveId: string,
  status: "approved" | "rejected",
  rejectionReason?: string
) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const { error } = await supabase
    .from("leave_requests")
    .update({
      status,
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      rejection_reason: rejectionReason || null,
    })
    .eq("id", leaveId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/hr/leave");
  revalidatePath("/hr");
  return { success: true };
}

// ─── Payroll Actions ───────────────────────────────────────────────────────

export async function createPayrollEntry(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const userId = String(formData.get("user_id") ?? "").trim();
  const month = String(formData.get("month") ?? "").trim();
  const basicSalary = parseFloat(String(formData.get("basic_salary") ?? "0"));
  const allowances = parseFloat(String(formData.get("allowances") ?? "0"));
  const deductions = parseFloat(String(formData.get("deductions") ?? "0"));
  const notes = String(formData.get("notes") ?? "").trim();

  if (!userId || !month) return { success: false, error: "Staff member and month are required" };
  if (basicSalary <= 0) return { success: false, error: "Basic salary must be greater than 0" };

  const netSalary = basicSalary + allowances - deductions;
  const amount = netSalary;

  const { error } = await supabase.from("payroll").insert({
    user_id: userId,
    month: `${month}-01`,
    amount,
    basic_salary: basicSalary,
    allowances,
    deductions,
    net_salary: netSalary,
    status: "pending",
    notes,
    processed_by: profile.id,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/hr/payroll");
  revalidatePath("/hr");
  return { success: true };
}

export async function markPayrollPaid(payrollId: string, paymentMethod: string) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const { error } = await supabase
    .from("payroll")
    .update({
      status: "paid",
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: paymentMethod,
    })
    .eq("id", payrollId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/hr/payroll");
  revalidatePath("/hr");
  return { success: true };
}

export async function bulkProcessPayroll(month: string) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  // Get all staff with base salary set
  const { data: staffList } = await supabase
    .from("staff_profiles")
    .select("id, base_salary")
    .eq("is_active", true)
    .gt("base_salary", 0);

  if (!staffList || staffList.length === 0) {
    return { success: false, error: "No active staff with salary configured" };
  }

  const monthDate = `${month}-01`;

  // Check which staff already have payroll for this month
  const { data: existing } = await supabase
    .from("payroll")
    .select("user_id")
    .eq("month", monthDate);

  const existingIds = new Set((existing || []).map((e) => e.user_id));
  const toCreate = staffList.filter((s) => !existingIds.has(s.id));

  if (toCreate.length === 0) {
    return { success: false, error: "All staff already have payroll for this month" };
  }

  const entries = toCreate.map((s) => ({
    user_id: s.id,
    month: monthDate,
    amount: s.base_salary,
    basic_salary: s.base_salary,
    allowances: 0,
    deductions: 0,
    net_salary: s.base_salary,
    status: "pending" as const,
    processed_by: profile.id,
  }));

  const { error } = await supabase.from("payroll").insert(entries);
  if (error) return { success: false, error: error.message };

  revalidatePath("/hr/payroll");
  revalidatePath("/hr");
  return { success: true, count: toCreate.length };
}

// ─── Staff Profile Actions ─────────────────────────────────────────────────

export async function createStaffProfile(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const staffId = String(formData.get("staff_id") ?? "").trim();
  const departmentId = String(formData.get("department_id") ?? "").trim() || null;
  const designation = String(formData.get("designation") ?? "").trim();
  const employmentType = String(formData.get("employment_type") ?? "full_time");
  const dateOfJoining = String(formData.get("date_of_joining") ?? "").trim() || null;
  const baseSalary = parseFloat(String(formData.get("base_salary") ?? "0"));
  const gender = String(formData.get("gender") ?? "").trim() || null;
  const dateOfBirth = String(formData.get("date_of_birth") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim();
  const emergencyName = String(formData.get("emergency_contact_name") ?? "").trim();
  const emergencyPhone = String(formData.get("emergency_contact_phone") ?? "").trim();

  if (!staffId) return { success: false, error: "Staff member is required" };

  // Generate employee ID
  const { count } = await supabase.from("staff_profiles").select("*", { count: "exact", head: true });
  const employeeId = `EMP-${String((count || 0) + 1).padStart(4, "0")}`;

  const { error } = await supabase.from("staff_profiles").upsert({
    id: staffId,
    employee_id: employeeId,
    department_id: departmentId,
    designation,
    employment_type: employmentType,
    date_of_joining: dateOfJoining,
    base_salary: baseSalary,
    gender,
    date_of_birth: dateOfBirth,
    address,
    emergency_contact_name: emergencyName,
    emergency_contact_phone: emergencyPhone,
    is_active: true,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/hr/staff");
  revalidatePath("/hr");
  return { success: true };
}

// ─── Department Actions ────────────────────────────────────────────────────

export async function createDepartment(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const headId = String(formData.get("head_id") ?? "").trim() || null;

  if (!name || !code) return { success: false, error: "Name and code are required" };

  const { error } = await supabase.from("departments").insert({
    name,
    code: code.toUpperCase(),
    description,
    head_id: headId,
    is_active: true,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/hr/departments");
  revalidatePath("/hr");
  return { success: true };
}

// ─── Staff Attendance Actions ──────────────────────────────────────────────

export async function markStaffAttendance(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const staffId = String(formData.get("staff_id") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const status = String(formData.get("status") ?? "present");
  const checkIn = String(formData.get("check_in") ?? "").trim() || null;
  const checkOut = String(formData.get("check_out") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!staffId || !date) return { success: false, error: "Staff and date are required" };

  const { error } = await supabase.from("staff_attendance").upsert({
    staff_id: staffId,
    date,
    status,
    check_in: checkIn,
    check_out: checkOut,
    notes,
    marked_by: profile.id,
  }, { onConflict: "staff_id,date" });

  if (error) return { success: false, error: error.message };

  revalidatePath("/hr/attendance");
  return { success: true };
}

export async function bulkMarkAttendance(
  date: string,
  entries: Array<{ staffId: string; status: string }>
) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const rows = entries.map((e) => ({
    staff_id: e.staffId,
    date,
    status: e.status,
    marked_by: profile.id,
  }));

  const { error } = await supabase
    .from("staff_attendance")
    .upsert(rows, { onConflict: "staff_id,date" });

  if (error) return { success: false, error: error.message };

  revalidatePath("/hr/attendance");
  return { success: true };
}

// ─── Performance Review Actions ────────────────────────────────────────────

export async function createPerformanceReview(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const staffId = String(formData.get("staff_id") ?? "").trim();
  const reviewPeriod = String(formData.get("review_period") ?? "").trim();
  const reviewDate = String(formData.get("review_date") ?? "").trim();
  const overallRating = parseFloat(String(formData.get("overall_rating") ?? "0"));
  const teachingQuality = parseFloat(String(formData.get("teaching_quality") ?? "0")) || null;
  const punctuality = parseFloat(String(formData.get("punctuality") ?? "0")) || null;
  const teamwork = parseFloat(String(formData.get("teamwork") ?? "0")) || null;
  const communication = parseFloat(String(formData.get("communication") ?? "0")) || null;
  const strengths = String(formData.get("strengths") ?? "").trim();
  const improvements = String(formData.get("areas_for_improvement") ?? "").trim();
  const goals = String(formData.get("goals_next_period") ?? "").trim();
  const comments = String(formData.get("comments") ?? "").trim();

  if (!staffId || !reviewPeriod || !reviewDate) {
    return { success: false, error: "Staff, period, and date are required" };
  }

  const { error } = await supabase.from("performance_reviews").insert({
    staff_id: staffId,
    reviewer_id: profile.id,
    review_period: reviewPeriod,
    review_date: reviewDate,
    overall_rating: overallRating || null,
    teaching_quality: teachingQuality,
    punctuality,
    teamwork,
    communication,
    strengths,
    areas_for_improvement: improvements,
    goals_next_period: goals,
    comments,
    status: "submitted",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/hr/performance");
  return { success: true };
}

// ─── Announcement Actions ──────────────────────────────────────────────────

export async function createAnnouncement(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal");
  const expiresAt = String(formData.get("expires_at") ?? "").trim() || null;

  if (!title || !content) return { success: false, error: "Title and content are required" };

  const { error } = await supabase.from("hr_announcements").insert({
    title,
    content,
    priority,
    published_by: profile.id,
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    is_active: true,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/hr");
  return { success: true };
}
