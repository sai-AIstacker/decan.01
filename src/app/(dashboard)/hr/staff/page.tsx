import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Users, ChevronRight, Plus, Mail, Phone, Building2, Briefcase, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { AddStaffProfileForm } from "./ui/add-staff-profile-form";
import { UserAvatarServer } from "@/components/ui/user-avatar";

const roleColors: Record<string, string> = {
  teacher: "bg-blue-100 text-zinc-900 dark:bg-zinc-800 dark:text-blue-300",
  admin: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  hr: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  accounting: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  app_config: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const employmentColors: Record<string, string> = {
  full_time: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  part_time: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  contract: "bg-blue-100 text-zinc-900 dark:bg-zinc-800 dark:text-blue-300",
  intern: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

export default async function StaffDirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "hr") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const params: Record<string, string | undefined> = await searchParams ?? {};

  const [
    { data: staffRoles },
    { data: departments },
    { data: staffProfiles },
  ] = await Promise.all([
    supabase.from("roles").select("id, name").in("name", ["teacher", "admin", "accounting", "hr", "app_config"]),
    supabase.from("departments").select("id, name, code").eq("is_active", true).order("name"),
    supabase.from("staff_profiles").select("*, departments(name), profiles:id(full_name, email, phone)").eq("is_active", true),
  ]);

  const staffRoleIds = (staffRoles || []).map((r) => r.id);
  const { data: userRolesData } = await supabase
    .from("user_roles")
    .select("user_id, roles(name)")
    .in("role_id", staffRoleIds);

  // Build role map
  const rolesByUser: Record<string, string[]> = {};
  (userRolesData || []).forEach((ur: any) => {
    if (!rolesByUser[ur.user_id]) rolesByUser[ur.user_id] = [];
    if (ur.roles?.name) rolesByUser[ur.user_id].push(ur.roles.name);
  });

  // Get all staff users (with or without staff_profiles)
  const allStaffUserIds = Object.keys(rolesByUser);
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone")
    .in("id", allStaffUserIds)
    .order("full_name");

  const staffProfileMap: Record<string, any> = {};
  (staffProfiles || []).forEach((sp: any) => { staffProfileMap[sp.id] = sp; });

  // Merge
  let staffList = (allProfiles || []).map((p) => ({
    ...p,
    roles: rolesByUser[p.id] || [],
    staffProfile: staffProfileMap[p.id] || null,
  }));

  // Filter
  if (params.role) staffList = staffList.filter((s) => s.roles.includes(params.role!));
  if (params.dept) staffList = staffList.filter((s) => s.staffProfile?.department_id === params.dept);
  if (params.search) {
    const q = params.search.toLowerCase();
    staffList = staffList.filter((s) =>
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.staffProfile?.designation?.toLowerCase().includes(q)
    );
  }

  const roleOptions = ["teacher", "admin", "hr", "accounting", "app_config"];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/hr" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">HR</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Staff Directory</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              Staff Directory
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{staffList.length} staff members</p>
          </div>
          <AddStaffProfileForm
            staffUsers={(allProfiles || []).filter((p) => !staffProfileMap[p.id])}
            departments={departments || []}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/hr/staff"
          className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${!params.role && !params.dept ? "bg-[#1d1d1f] text-white border-zinc-900" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
        >
          All Staff
        </Link>
        {roleOptions.map((r) => (
          <Link
            key={r}
            href={`/hr/staff?role=${r}`}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors capitalize ${params.role === r ? "bg-[#1d1d1f] text-white border-zinc-900" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            {r.replace("_", " ")}
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Teachers", value: Object.values(rolesByUser).filter((r) => r.includes("teacher")).length, color: "text-zinc-900 dark:text-zinc-100 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-blue-950/30" },
          { label: "Admin Staff", value: Object.values(rolesByUser).filter((r) => r.includes("admin")).length, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30" },
          { label: "HR Staff", value: Object.values(rolesByUser).filter((r) => r.includes("hr")).length, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
          { label: "Accounting", value: Object.values(rolesByUser).filter((r) => r.includes("accounting")).length, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl ${s.bg} border border-slate-200/60 dark:border-slate-700/50 p-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Staff Grid */}
      {staffList.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-16 text-center">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No staff found</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">Staff members are added when users are assigned staff roles.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staffList.map((staff) => {
            const sp = staff.staffProfile;
            return (
              <div key={staff.id} className="apple-card hover:shadow-lg transition-all p-5">
                <div className="flex items-start gap-3 mb-3">
                  <UserAvatarServer userId={staff.id} name={staff.full_name} size={48} className="rounded-2xl" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{staff.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{sp?.designation || "—"}</p>
                    {sp?.employee_id && (
                      <p className="text-xs font-mono text-zinc-900 dark:text-zinc-100 dark:text-zinc-300">{sp.employee_id}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{staff.email}</span>
                  </div>
                  {staff.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{staff.phone}</span>
                    </div>
                  )}
                  {sp?.departments?.name && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{sp.departments.name}</span>
                    </div>
                  )}
                  {sp?.date_of_joining && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Joined {sp.date_of_joining}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {staff.roles.map((role) => (
                    <span key={role} className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleColors[role] || "bg-slate-100 text-slate-600"}`}>
                      {role.replace("_", " ")}
                    </span>
                  ))}
                  {sp?.employment_type && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${employmentColors[sp.employment_type] || ""}`}>
                      {sp.employment_type.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
