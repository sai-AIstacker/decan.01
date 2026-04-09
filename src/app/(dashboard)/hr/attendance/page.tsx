import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserCheck, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { BulkAttendanceForm } from "./ui/bulk-attendance-form";
import { AttendanceDatePicker } from "./ui/date-picker";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  present: { label: "Present", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  absent: { label: "Absent", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", icon: XCircle },
  late: { label: "Late", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: AlertTriangle },
  half_day: { label: "Half Day", color: "bg-blue-100 text-zinc-900 dark:bg-zinc-800 dark:text-blue-300", icon: Clock },
  on_leave: { label: "On Leave", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", icon: Clock },
};

export default async function StaffAttendancePage({
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
  const today = new Date().toISOString().split("T")[0];
  const selectedDate = params.date || today;

  const [{ data: staffRoles }, { data: attendance }] = await Promise.all([
    supabase.from("roles").select("id, name").in("name", ["teacher", "admin", "accounting", "hr"]),
    supabase
      .from("staff_attendance")
      .select("*, profiles:staff_id(full_name, email)")
      .eq("date", selectedDate),
  ]);

  const staffRoleIds = (staffRoles || []).map((r) => r.id);
  const { data: userRolesData } = await supabase.from("user_roles").select("user_id").in("role_id", staffRoleIds);
  const staffIds = [...new Set((userRolesData || []).map((ur) => ur.user_id))];
  const { data: allStaff } = await supabase.from("profiles").select("id, full_name, email").in("id", staffIds).order("full_name");

  const attendanceMap: Record<string, any> = {};
  (attendance || []).forEach((a: any) => { attendanceMap[a.staff_id] = a; });

  const staffWithAttendance = (allStaff || []).map((s) => ({
    ...s,
    attendance: attendanceMap[s.id] || null,
  }));

  const counts = {
    present: (attendance || []).filter((a) => a.status === "present").length,
    absent: (attendance || []).filter((a) => a.status === "absent").length,
    late: (attendance || []).filter((a) => a.status === "late").length,
    notMarked: staffIds.length - (attendance || []).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/hr" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">HR</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Staff Attendance</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              Staff Attendance
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Mark and track daily staff attendance</p>
          </div>
          <BulkAttendanceForm staff={allStaff || []} date={selectedDate} existingAttendance={attendanceMap} />
        </div>
      </div>

      {/* Date Picker */}
      <AttendanceDatePicker selectedDate={selectedDate} today={today} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Present", value: counts.present, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200/60" },
          { label: "Absent", value: counts.absent, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200/60" },
          { label: "Late", value: counts.late, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200/60" },
          { label: "Not Marked", value: counts.notMarked, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/50", border: "border-slate-200/60" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Attendance Table */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            Attendance for {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{staffWithAttendance.length} staff members</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-800/50">
                {["Staff Member", "Check In", "Check Out", "Status", "Notes"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffWithAttendance.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">No staff found</td></tr>
              ) : (
                staffWithAttendance.map((staff) => {
                  const att = staff.attendance;
                  const scfg = att ? (statusConfig[att.status] || statusConfig.present) : null;
                  const StatusIcon = scfg?.icon;
                  return (
                    <tr key={staff.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{staff.full_name}</p>
                        <p className="text-xs text-slate-400">{staff.email}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{att?.check_in || "—"}</td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{att?.check_out || "—"}</td>
                      <td className="py-3 px-4">
                        {att && scfg && StatusIcon ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${scfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {scfg.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not marked</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400">{att?.notes || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
