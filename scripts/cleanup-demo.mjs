#!/usr/bin/env node
/**
 * Decan School Demo Data Cleanup
 * Deletes all data seeded by ultimate-test.mjs
 * Run: node scripts/cleanup-demo.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  break;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const G = "\x1b[32m", R = "\x1b[31m", Y = "\x1b[33m", C = "\x1b[36m", B = "\x1b[1m", N = "\x1b[0m";
const ok   = m => console.log(`  ${G}✓${N} ${m}`);
const fail = m => console.log(`  ${R}✗${N} ${m}`);
const sec  = m => console.log(`\n${C}${B}▶ ${m}${N}`);
const info = m => console.log(`  ${Y}ℹ${N}  ${m}`);

async function del(table, col, vals) {
  if (!vals || vals.length === 0) return 0;
  const { error, count } = await db.from(table).delete({ count: "exact" }).in(col, vals);
  if (error) { fail(`DELETE ${table}: ${error.message}`); return 0; }
  return count ?? 0;
}

async function delAll(table) {
  const { error, count } = await db.from(table).delete({ count: "exact" }).neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) { fail(`DELETE ALL ${table}: ${error.message}`); return 0; }
  return count ?? 0;
}

async function main() {
  console.log(`\n${B}${C}╔══════════════════════════════════════════════╗${N}`);
  console.log(`${B}${C}║       Decan School Demo Data Cleanup                 ║${N}`);
  console.log(`${B}${C}╚══════════════════════════════════════════════╝${N}`);

  // ── Get demo user IDs ──────────────────────────────────────────────────────
  sec("Finding demo users");
  const { data: demoProfiles, error: profileErr } = await db
    .from("profiles")
    .select("id, email")
    .like("email", "demo.%@school.test");

  if (profileErr) { fail(`Could not fetch demo profiles: ${profileErr.message}`); process.exit(1); }
  if (!demoProfiles || demoProfiles.length === 0) {
    info("No demo users found — nothing to clean up.");
    process.exit(0);
  }

  const demoIds = demoProfiles.map(p => p.id);
  info(`Found ${demoIds.length} demo users`);

  // ── Delete dependent data in correct order (children before parents) ───────
  sec("Deleting academic data");

  // Marks
  const { data: exams } = await db.from("exams").select("id").in("class_id",
    (await db.from("classes").select("id").in("class_teacher_id", demoIds)).data?.map(c => c.id) ?? []
  );
  // Simpler: delete marks where student_id is a demo user
  let n = await del("marks", "student_id", demoIds);
  ok(`Marks deleted: ${n}`);

  // Attendance
  n = await del("attendance", "student_id", demoIds);
  ok(`Attendance records deleted: ${n}`);

  // Assignment submissions
  n = await del("assignment_submissions", "student_id", demoIds);
  ok(`Assignment submissions deleted: ${n}`);

  // Assignments created by demo teachers
  n = await del("assignments", "teacher_id", demoIds);
  ok(`Assignments deleted: ${n}`);

  // Lesson plans
  n = await del("lesson_plans", "teacher_id", demoIds);
  ok(`Lesson plans deleted: ${n}`);

  // Class notices
  n = await del("class_notices", "teacher_id", demoIds);
  ok(`Class notices deleted: ${n}`);

  // Teacher notes
  n = await del("teacher_notes", "teacher_id", demoIds);
  ok(`Teacher notes deleted: ${n}`);

  // Enrollments
  n = await del("enrollments", "student_id", demoIds);
  ok(`Enrollments deleted: ${n}`);

  // Parent-student links
  n = await del("parent_students", "parent_id", demoIds);
  ok(`Parent-student links deleted: ${n}`);

  // Exam subjects & exams (for classes owned by demo teachers)
  const { data: demoCls } = await db.from("classes")
    .select("id").in("class_teacher_id", demoIds);
  const demoClsIds = demoCls?.map(c => c.id) ?? [];

  if (demoClsIds.length > 0) {
    const { data: demoExams } = await db.from("exams").select("id").in("class_id", demoClsIds);
    const demoExamIds = demoExams?.map(e => e.id) ?? [];

    if (demoExamIds.length > 0) {
      n = await del("exam_subjects", "exam_id", demoExamIds);
      ok(`Exam subjects deleted: ${n}`);
      n = await del("exams", "id", demoExamIds);
      ok(`Exams deleted: ${n}`);
    }

    // Timetable blocks
    n = await del("timetables", "class_id", demoClsIds);
    ok(`Timetable blocks deleted: ${n}`);

    // Class-subjects
    n = await del("class_subjects", "class_id", demoClsIds);
    ok(`Class-subject mappings deleted: ${n}`);

    // Classes
    n = await del("classes", "id", demoClsIds);
    ok(`Classes deleted: ${n}`);
  }

  // Time slots seeded by us (named "Period N")
  const { data: demoSlots } = await db.from("time_slots")
    .select("id").like("name", "Period %");
  if (demoSlots && demoSlots.length > 0) {
    n = await del("time_slots", "id", demoSlots.map(s => s.id));
    ok(`Time slots deleted: ${n}`);
  }

  sec("Deleting accounting data");

  // Payments for demo student invoices
  const { data: demoInvoices } = await db.from("invoices")
    .select("id").in("student_id", demoIds);
  const demoInvIds = demoInvoices?.map(i => i.id) ?? [];
  if (demoInvIds.length > 0) {
    n = await del("payments", "invoice_id", demoInvIds);
    ok(`Payments deleted: ${n}`);
    n = await del("invoices", "id", demoInvIds);
    ok(`Invoices deleted: ${n}`);
  }

  // Transactions linked to demo students
  n = await del("transactions", "student_id", demoIds);
  ok(`Transactions deleted: ${n}`);

  // Journal entry lines & entries created by demo users
  const { data: demoJournals } = await db.from("journal_entries")
    .select("id").in("created_by", demoIds);
  const demoJournalIds = demoJournals?.map(j => j.id) ?? [];
  if (demoJournalIds.length > 0) {
    n = await del("journal_entry_lines", "journal_entry_id", demoJournalIds);
    ok(`Journal lines deleted: ${n}`);
    n = await del("journal_entries", "id", demoJournalIds);
    ok(`Journal entries deleted: ${n}`);
  }

  // Expenses (seeded ones — by title pattern)
  const expenseTitles = [
    "Electricity Bill Sep", "Water Bill Sep", "Stationery Purchase",
    "Maintenance - Plumbing", "Internet Bill", "Cleaning Supplies",
  ];
  const { data: demoExpenses } = await db.from("expenses")
    .select("id").in("title", expenseTitles);
  if (demoExpenses && demoExpenses.length > 0) {
    n = await del("expenses", "id", demoExpenses.map(e => e.id));
    ok(`Expenses deleted: ${n}`);
  }

  // Budget items & period
  const { data: demoBudgetPeriod } = await db.from("budget_periods")
    .select("id").eq("name", "FY 2025-26").maybeSingle();
  if (demoBudgetPeriod) {
    n = await del("budget_items", "budget_period_id", [demoBudgetPeriod.id]);
    ok(`Budget items deleted: ${n}`);
    await db.from("budget_periods").delete().eq("id", demoBudgetPeriod.id);
    ok("Budget period deleted");
  }

  // Fixed assets (seeded ones)
  const assetNames = [
    "School Bus 1", "Computer Lab PCs", "Science Lab Equipment",
    "Library Furniture", "Projectors x10",
  ];
  const { data: demoAssets } = await db.from("fixed_assets")
    .select("id").in("name", assetNames);
  if (demoAssets && demoAssets.length > 0) {
    n = await del("fixed_assets", "id", demoAssets.map(a => a.id));
    ok(`Fixed assets deleted: ${n}`);
  }

  // Bank accounts (seeded ones)
  const bankNames = ["Main Operating Account", "Petty Cash Account", "Fee Collection Account"];
  const { data: demoBanks } = await db.from("bank_accounts")
    .select("id").in("name", bankNames);
  if (demoBanks && demoBanks.length > 0) {
    n = await del("bank_accounts", "id", demoBanks.map(b => b.id));
    ok(`Bank accounts deleted: ${n}`);
  }

  // Cost centers (seeded ones)
  const ccCodes = ["ADM", "ACA", "SPT", "LIB", "IT"];
  const { data: demoCCs } = await db.from("cost_centers")
    .select("id").in("code", ccCodes);
  if (demoCCs && demoCCs.length > 0) {
    n = await del("cost_centers", "id", demoCCs.map(c => c.id));
    ok(`Cost centers deleted: ${n}`);
  }

  // Chart of accounts (seeded ones)
  const acctCodes = ["1001","1002","1100","2001","3001","4001","5001","5002","5003"];
  const { data: demoAccts } = await db.from("chart_of_accounts")
    .select("id").in("account_code", acctCodes);
  if (demoAccts && demoAccts.length > 0) {
    n = await del("chart_of_accounts", "id", demoAccts.map(a => a.id));
    ok(`GL accounts deleted: ${n}`);
  }

  // Finance categories (seeded ones)
  const catNames = ["Tuition Fees","Library Fees","Sports Fees","Salaries","Utilities","Maintenance","Stationery","Transport"];
  const { data: demoCats } = await db.from("finance_categories")
    .select("id").in("name", catNames);
  if (demoCats && demoCats.length > 0) {
    n = await del("finance_categories", "id", demoCats.map(c => c.id));
    ok(`Finance categories deleted: ${n}`);
  }

  sec("Deleting HR data");

  // HR announcements
  n = await del("hr_announcements", "published_by", demoIds);
  ok(`HR announcements deleted: ${n}`);

  // Performance reviews
  n = await del("performance_reviews", "staff_id", demoIds);
  ok(`Performance reviews deleted: ${n}`);

  // Staff attendance
  n = await del("staff_attendance", "staff_id", demoIds);
  ok(`Staff attendance deleted: ${n}`);

  // Payroll
  n = await del("payroll", "user_id", demoIds);
  ok(`Payroll entries deleted: ${n}`);

  // Leave requests
  n = await del("leave_requests", "user_id", demoIds);
  ok(`Leave requests deleted: ${n}`);

  // Staff profiles
  n = await del("staff_profiles", "id", demoIds);
  ok(`Staff profiles deleted: ${n}`);

  // Departments (seeded ones)
  const deptCodes = ["ACA","ADM","FIN","IT","SPT"];
  const { data: demoDepts } = await db.from("departments")
    .select("id").in("code", deptCodes);
  if (demoDepts && demoDepts.length > 0) {
    n = await del("departments", "id", demoDepts.map(d => d.id));
    ok(`Departments deleted: ${n}`);
  }

  sec("Deleting demo users");

  // User roles
  n = await del("user_roles", "user_id", demoIds);
  ok(`User role assignments deleted: ${n}`);

  // Profiles
  n = await del("profiles", "id", demoIds);
  ok(`Profiles deleted: ${n}`);

  // Auth users (must be last)
  let authDeleted = 0;
  for (const uid of demoIds) {
    const { error } = await db.auth.admin.deleteUser(uid);
    if (!error) authDeleted++;
  }
  ok(`Auth users deleted: ${authDeleted}/${demoIds.length}`);

  // ── Subjects seeded by us ──────────────────────────────────────────────────
  sec("Deleting seeded subjects & academic year");
  const subCodes = ["MATH","ENG","SCI","HIST","GEO","PHY","CHEM","BIO","CS","ART"];
  const { data: demoSubs } = await db.from("subjects").select("id").in("code", subCodes);
  if (demoSubs && demoSubs.length > 0) {
    n = await del("subjects", "id", demoSubs.map(s => s.id));
    ok(`Subjects deleted: ${n}`);
  }

  // Academic year (only delete the one we created — "2025-26")
  const { data: demoYear } = await db.from("academic_years")
    .select("id").eq("name", "2025-26").maybeSingle();
  if (demoYear) {
    await db.from("academic_years").delete().eq("id", demoYear.id);
    ok("Academic year '2025-26' deleted");
  }

  console.log(`\n${G}${B}✓ Demo data cleanup complete.${N}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
