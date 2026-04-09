import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Building2, ChevronRight, Users, Plus } from "lucide-react";
import Link from "next/link";
import { CreateDepartmentForm } from "./ui/create-department-form";

export default async function DepartmentsPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "hr") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [{ data: departments }, { data: staffProfiles }] = await Promise.all([
    supabase.from("departments").select("*, profiles:head_id(full_name)").eq("is_active", true).order("name"),
    supabase.from("staff_profiles").select("department_id").eq("is_active", true),
  ]);

  const { data: staffRoles } = await supabase.from("roles").select("id, name").in("name", ["teacher", "admin", "accounting", "hr"]);
  const staffRoleIds = (staffRoles || []).map((r) => r.id);
  const { data: allStaff } = await supabase.from("user_roles").select("user_id").in("role_id", staffRoleIds);
  const { data: allProfiles } = await supabase.from("profiles").select("id, full_name").in("id", (allStaff || []).map((s) => s.user_id)).order("full_name");

  const staffCountByDept: Record<string, number> = {};
  (staffProfiles || []).forEach((sp) => {
    if (sp.department_id) staffCountByDept[sp.department_id] = (staffCountByDept[sp.department_id] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/hr" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">HR</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Departments</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              Departments
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{(departments || []).length} active departments</p>
          </div>
          <CreateDepartmentForm staffList={allProfiles || []} />
        </div>
      </div>

      {(departments || []).length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-16 text-center">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No departments yet</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">Create your first department using the button above.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(departments || []).map((dept: any) => (
            <div key={dept.id} className="apple-card hover:shadow-lg transition-all p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-white font-bold text-lg">
                  {dept.code?.substring(0, 2)}
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 text-xs font-mono font-medium">{dept.code}</span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg mb-1">{dept.name}</h3>
              {dept.description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{dept.description}</p>}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Users className="w-4 h-4" />
                  <span>{staffCountByDept[dept.id] || 0} staff</span>
                </div>
                {dept.profiles?.full_name && (
                  <span className="text-xs text-slate-400">Head: {dept.profiles.full_name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
