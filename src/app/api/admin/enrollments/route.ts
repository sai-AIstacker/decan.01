import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionProfile, canConfigureSchool } from "@/lib/auth/profile";

export async function GET(req: NextRequest) {
  const { profile } = await getSessionProfile();
  if (!profile || !canConfigureSchool(profile.roles))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp     = req.nextUrl.searchParams;
  const page   = Math.max(1, Number(sp.get("page") || 1));
  const limit  = Math.min(50, Number(sp.get("limit") || 15));
  const search = sp.get("search") || "";
  const offset = (page - 1) * limit;

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

  // Get active year
  const { data: ay } = await db.from("academic_years").select("id").eq("is_active", true).limit(1).maybeSingle();
  const yearId = ay?.id || "00000000-0000-0000-0000-000000000000";

  let q = db.from("enrollments")
    .select("id,status,created_at,profiles:student_id(full_name,email),classes(name,section)", { count: "exact" })
    .eq("academic_year_id", yearId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    // search by student name via profiles join — use a subquery approach
    const { data: matchProfiles } = await db.from("profiles").select("id").ilike("full_name", `%${search}%`);
    const ids = (matchProfiles || []).map(p => p.id);
    if (ids.length > 0) q = q.in("student_id", ids);
    else return NextResponse.json({ data: [], total: 0 });
  }

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [], total: count || 0 });
}
