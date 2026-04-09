import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getSessionProfile, canConfigureSchool } from "@/lib/auth/profile";

export async function GET(req: NextRequest) {
  const { profile } = await getSessionProfile();
  if (!profile || !canConfigureSchool(profile.roles))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page   = Math.max(1, Number(searchParams.get("page")  || 1));
  const limit  = Math.min(50, Number(searchParams.get("limit") || 15));
  const search = searchParams.get("search") || "";
  const sort   = searchParams.get("sort")   || "created_at";
  const dir    = searchParams.get("dir")    === "asc" ? true : false;
  const offset = (page - 1) * limit;

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let q = db.from("classes")
    .select("id,name,section,is_active,academic_years(name),profiles:class_teacher_id(full_name)", { count: "exact" })
    .order(sort, { ascending: dir })
    .range(offset, offset + limit - 1);

  if (search) q = q.or(`name.ilike.%${search}%,section.ilike.%${search}%`);

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data || [], total: count || 0 });
}
