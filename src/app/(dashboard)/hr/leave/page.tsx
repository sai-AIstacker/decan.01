import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarX, ChevronRight, CheckCircle2, XCircle, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { ApplyLeaveForm } from "./ui/apply-leave-form";
import { LeaveActionButtons } from "./ui/leave-action-buttons";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", icon: XCircle },
};

export default async function LeaveManagementPage({
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
  const statusFilter = params.status || "all";
  const page = parseInt(params.page || "1");
  const pageSize = 15;

  const [{ data: leaves }, { data: leaveTypes }] = await Promise.all([
    supabase
      .from("leave_requests")
      .select("*, profiles:user_id(full_name, email), leave_types:leave_type_id(name, is_paid)")
      .order("created_at", { ascending: false }),
    supabase.from("leave_types").select("*").eq("is_active", true).order("name"),
  ]);

  const allLeaves = (leaves || []) as any[];
  const filtered = statusFilter === "all" ? allLeaves : allLeaves.filter((l) => l.status === statusFilter);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const counts = {
    all: allLeaves.length,
    pending: allLeaves.filter((l) => l.status === "pending").length,
    approved: allLeaves.filter((l) => l.status === "approved").length,
    rejected: allLeaves.filter((l) => l.status === "rejected").length,
  };

  // Leave type usage
  const leaveTypeUsage: Record<string, number> = {};
  allLeaves.filter((l) => l.status === "approved").forEach((l: any) => {
    const name = l.leave_types?.name || "Unknown";
    leaveTypeUsage[name] = (leaveTypeUsage[name] || 0) + (l.total_days || 1);
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/hr" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">HR</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Leave Management</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <CalendarX className="w-5 h-5 text-white" />
              </div>
              Leave Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Review, approve, and track staff leave requests</p>
          </div>
          <ApplyLeaveForm leaveTypes={leaveTypes || []} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Requests", value: counts.all, color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-50 dark:bg-slate-900/50", border: "border-slate-200/60" },
          { label: "Pending", value: counts.pending, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200/60" },
          { label: "Approved", value: counts.approved, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200/60" },
          { label: "Rejected", value: counts.rejected, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200/60" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border ${kpi.border} ${kpi.bg} p-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Leave Type Usage */}
      {Object.keys(leaveTypeUsage).length > 0 && (
        <div className="apple-card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Leave Type Usage (Approved Days)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(leaveTypeUsage).map(([type, days]) => (
              <div key={type} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{type}</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 dark:text-zinc-300">{days}</p>
                <p className="text-xs text-slate-400">days</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave Requests Table */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Leave Requests</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} requests</p>
            </div>
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
              {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                <Link
                  key={s}
                  href={`?status=${s}`}
                  className={`px-3 py-2 font-medium capitalize transition-colors ${statusFilter === s ? "bg-[#1d1d1f] text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                >
                  {s} ({counts[s]})
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-800/50">
                {["Staff Member", "Leave Type", "From", "To", "Days", "Reason", "Status", "Action"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">No leave requests found</td></tr>
              ) : (
                paginated.map((leave: any) => {
                  const scfg = statusConfig[leave.status] || statusConfig.pending;
                  const StatusIcon = scfg.icon;
                  return (
                    <tr key={leave.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{leave.profiles?.full_name || "—"}</p>
                        <p className="text-xs text-slate-400">{leave.profiles?.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300">{leave.leave_types?.name || "General"}</p>
                        {leave.leave_types?.is_paid === false && <p className="text-xs text-rose-500">Unpaid</p>}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{leave.start_date}</td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{leave.end_date}</td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {leave.is_half_day ? "0.5" : (leave.total_days || "—")}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{leave.reason}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${scfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {scfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {leave.status === "pending" && (
                          <LeaveActionButtons leaveId={leave.id} />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && <Link href={`?status=${statusFilter}&page=${page - 1}`} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Previous</Link>}
              {page < totalPages && <Link href={`?status=${statusFilter}&page=${page + 1}`} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
