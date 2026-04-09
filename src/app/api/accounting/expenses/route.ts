import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionProfile, hasRole } from "@/lib/auth/profile";

export async function GET(req: NextRequest) {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp     = req.nextUrl.searchParams;
  const page   = Math.max(1, Number(sp.get("page") || 1));
  const limit  = Math.min(50, Number(sp.get("limit") || 15));
  const search = sp.get("search") || "";
  const offset = (page - 1) * limit;

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

  let q = db.from("expenses")
    .select("id,title,amount,method,expense_date,notes,finance_categories(name)", { count: "exact" })
    .order("expense_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) q = q.ilike("title", `%${search}%`);

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [], total: count || 0 });
}
