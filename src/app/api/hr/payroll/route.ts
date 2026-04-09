import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionProfile, hasRole } from "@/lib/auth/profile";

export async function GET(req: NextRequest) {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "hr") && !hasRole(profile.roles, "admin")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp     = req.nextUrl.searchParams;
  const page   = Math.max(1, Number(sp.get("page") || 1));
  const limit  = Math.min(50, Number(sp.get("limit") || 15));
  const search = sp.get("search") || "";
  const month  = sp.get("month") || new Date().toISOString().substring(0, 7);
  const status = sp.get("status") || "all";
  const offset = (page - 1) * limit;

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

  let q = db.from("payroll")
    .select("id,month,amount,basic_salary,allowances,deductions,net_salary,status,payment_date,payment_method,profiles:user_id(full_name,email)", { count: "exact" })
    .like("month", `${month}%`)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== "all") q = q.eq("status", status);

  if (search) {
    const { data: mp } = await db.from("profiles").select("id").ilike("full_name", `%${search}%`);
    const ids = (mp || []).map(p => p.id);
    if (ids.length > 0) q = q.in("user_id", ids);
    else return NextResponse.json({ data: [], total: 0 });
  }

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [], total: count || 0 });
}
