"use server";

import { createClient } from "@/lib/supabase/server";

export async function sendNotification(
  userId: string, 
  title: string, 
  message: string, 
  actionUrl?: string
) {
  const supabase = await createClient();
  
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    action_url: actionUrl || null,
  });
  
  if (error) {
    console.error("Failed to send notification:", error.message);
  }
}

export async function sendNotificationToClass(
  classId: string, 
  title: string, 
  message: string, 
  actionUrl?: string
) {
  const supabase = await createClient();
  
  // Get all active students in class
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("class_id", classId)
    .eq("status", "active");

  if (!enrollments || enrollments.length === 0) return;

  const payloads = enrollments.map(e => ({
    user_id: e.student_id,
    title,
    message,
    action_url: actionUrl || null,
  }));

  const { error } = await supabase.from("notifications").insert(payloads);
  
  if (error) {
    console.error("Failed to send class notifications:", error.message);
  }
}
export async function triggerAutomationEvent(
  triggerEvent: 'fee_due' | 'attendance_absent' | 'result_published',
  targetUserId: string,
  actionUrl?: string
) {
  const supabase = await createClient();
  
  // 1. Check if an active rule binds this event
  const { data: rules } = await supabase
    .from("automation_rules")
    .select("action_type, email_templates(subject, body)")
    .eq("trigger_event", triggerEvent)
    .eq("is_active", true);

  if (!rules || rules.length === 0) return; // Sequence halted. Automation is suspended natively.

  // 2. Dispatch sequence array structurally
  for (const rule of rules) {
     const template = rule.email_templates as any;
     if (!template) continue;

     // Note: Advanced template interpolation (e.g. replacing {{name}} with user specific maps)
     // could be injected here before sending. We use literal template definitions currently.
     const payloadSubject = template.subject || "System Notification";
     const payloadBody = template.body || "Automated payload executed.";

     if (rule.action_type === 'notification' || rule.action_type === 'email') {
         // By structural defaults we pump everything to internal notifications
         await sendNotification(targetUserId, payloadSubject, payloadBody, actionUrl);
     }
  }
}
