import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    process.env[key] = value;
  }
}

async function main() {
  const projectRoot = process.cwd();
  loadEnvFile(path.join(projectRoot, ".env.local"));
  loadEnvFile(path.join(projectRoot, ".env"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const demoPassword = process.env.DEMO_PASSWORD || "Password123!";

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local/.env"
    );
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const demoUsers = [
    { email: "admin@school.test", roles: ["admin"], full_name: "Admin User" },
    { email: "teacher1@school.test", roles: ["teacher"], full_name: "Teacher One" },
    { email: "student1@school.test", roles: ["student"], full_name: "Student One" },
    { email: "parent1@school.test", roles: ["parent"], full_name: "Parent One" },
    { email: "config@school.test", roles: ["app_config"], full_name: "Config User" },
    { email: "accounting@school.test", roles: ["accounting"], full_name: "Accounting User" },
    { email: "hr@school.test", roles: ["hr"], full_name: "HR User" },
  ];

  const userIds = new Map();

  async function getAuthUserIdByEmail(email) {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    const match = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    return match?.id || null;
  }

  async function safeUpsert(table, values, onConflict) {
    const { error } = await supabase.from(table).upsert(values, { onConflict });
    if (error) {
      if (typeof error.message === "string" && error.message.includes("Could not find the table")) {
        console.warn(`Skipping upsert for missing table ${table}`);
        return;
      }
      throw error;
    }
  }

  for (const user of demoUsers) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id,email")
      .eq("email", user.email)
      .maybeSingle();

    if (!existingProfile) {
      const { error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { full_name: user.full_name },
      });
      if (error && !error.message.toLowerCase().includes("already")) {
        throw error;
      }
    }

    let profile = existingProfile;
    if (!profile) {
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase
          .from("profiles")
          .select("id,email")
          .eq("email", user.email)
          .maybeSingle();
        if (data) {
          profile = data;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    if (!profile) {
      // If the auth trigger is missing, recover by creating the profile directly.
      const authUserId = await getAuthUserIdByEmail(user.email);
      if (!authUserId) {
        throw new Error(`Auth user not found for ${user.email}.`);
      }
      const { error: insertProfileError } = await supabase.from("profiles").upsert(
        {
          id: authUserId,
          email: user.email,
          full_name: user.full_name,
        },
        { onConflict: "id" }
      );
      if (insertProfileError) throw insertProfileError;

      // Assign roles
      for (const roleName of user.roles) {
        const { data: roleData } = await supabase
          .from("roles")
          .select("id")
          .eq("name", roleName)
          .single();
        if (roleData) {
          await safeUpsert("user_roles", { user_id: authUserId, role_id: roleData.id }, "user_id,role_id");
        }
      }

      const { data: recoveredProfile } = await supabase
        .from("profiles")
        .select("id,email")
        .eq("id", authUserId)
        .maybeSingle();
      profile = recoveredProfile || null;
    }

    if (!profile) {
      throw new Error(`Profile not found for ${user.email}.`);
    }

    userIds.set(user.email, profile.id);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: user.full_name })
      .eq("id", profile.id);
    if (updateError) throw updateError;

    // Assign roles
    for (const roleName of user.roles) {
      const { data: roleData } = await supabase
        .from("roles")
        .select("id")
        .eq("name", roleName)
        .single();
      if (roleData) {
        await safeUpsert("user_roles", { user_id: profile.id, role_id: roleData.id }, "user_id,role_id");
      }
    }
  }

  const classesToSeed = [
    { name: "Algebra I", section: "Period 3", grade_level: "9", academic_year: "2025-26" },
    { name: "Biology", section: "Period 1", grade_level: "10", academic_year: "2025-26" },
  ];

  const classIds = new Map();

  let academicYearId = null;
  const { data: existingYear, error: yearError } = await supabase
    .from("academic_years")
    .select("id")
    .eq("name", "2025-26")
    .maybeSingle();

  if (yearError) throw yearError;

  if (existingYear?.id) {
    academicYearId = existingYear.id;
  } else {
    const { data: insertedYear, error: insertYearError } = await supabase
      .from("academic_years")
      .insert({
        name: "2025-26",
        start_date: "2025-07-01",
        end_date: "2026-06-30",
        is_active: true,
      })
      .select("id")
      .single();
    if (insertYearError) throw insertYearError;
    academicYearId = insertedYear.id;
  }

  for (const c of classesToSeed) {
    const { data: existing } = await supabase
      .from("classes")
      .select("id,name")
      .eq("name", c.name)
      .eq("section", c.section)
      .eq("academic_year_id", academicYearId)
      .maybeSingle();

    if (existing) {
      classIds.set(`${c.name}:${c.section}`, existing.id);
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("classes")
      .insert({ name: c.name, section: c.section, academic_year_id: academicYearId })
      .select("id,name")
      .single();
    if (error) throw error;

    classIds.set(`${c.name}:${c.section}`, inserted.id);
  }

  const algebraId = classIds.get("Algebra I:Period 3");

  const teacherId = userIds.get("teacher1@school.test");
  const studentId = userIds.get("student1@school.test");
  const parentId = userIds.get("parent1@school.test");

  if (!teacherId || !studentId || !parentId || !algebraId) {
    throw new Error("Missing seeded IDs for relationships.");
  }

  await safeUpsert("class_teachers", { class_id: algebraId, teacher_id: teacherId }, "class_id,teacher_id");
  await safeUpsert("class_students", { class_id: algebraId, student_id: studentId }, "class_id,student_id");
  await safeUpsert("parent_students", { parent_id: parentId, student_id: studentId }, "parent_id,student_id");

  console.log("Seed complete.");
  console.log("Demo password:", demoPassword);
  console.log("Credentials:");
  for (const user of demoUsers) {
    console.log(`- ${user.email} / ${demoPassword} (${user.roles.join(", ")})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
