import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Briefcase, ChevronRight, CheckCircle2, Clock, Plus, Zap } from "lucide-react";
import Link from "next/link";
import { CreatePayrollForm } from "./ui/create-payroll-form";
import { MarkPaidButton } from "./ui/mark-paid-button";
import { BulkProcessButton } from "./ui/bulk-process-button";

const fmt = (v: number) =>
  `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function PayrollPage({
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
  const currentMonth = new Date().toISOString().substring(0, 7);
  const selectedMonth = params.month || currentMonth;
  const statusFilter = params.status || "all";

  const [{ data: payroll }, { data: staffRoles }] = await Promise.all([
    supabase
      .from("payroll")
      .select("*, profiles:user_id(full_name, email)")
      .order("month", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("roles").select("id, name").in("name", ["teacher", "admin", "accounting", "hr"]),
  ]);

  const staffRoleIds = (staffRoles || []).map((r) => r.id);
  const { data: userRolesData } = await supabase.from("user_roles").select("user_id").in("role_id", staffRoleIds);
  const staffIds = [...new Set((userRolesData || []).map((ur) => ur.user_id))];
  const { data: staffProfiles } = await supabase.from("profiles").select("id, full_name, email").in("id", staffIds).order("full_name");

  const allPayroll = (payroll || []) as any[];
  const monthPayroll = allPayroll.filter((p) => p.month?.startsWith(selectedMonth));
  const filtered = statusFilter === "all" ? monthPayroll : monthPayroll.filter((p) => p.status === statusFilter);

  const totalAmount = monthPayroll.reduce((s, p) => s + Number(p.net_salary || p.amount), 0);
  const paidAmount = monthPayroll.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.net_salary || p.amount), 0);
  const pendingAmount = monthPayroll.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.net_salary || p.amount), 0);

  // Get unique months for filter
  const months = [...new Set(allPayroll.map((p) => p.month?.substring(0, 7)).filter(Boolean))].sort().reverse().slice(0, 12);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/hr" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">HR</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Payroll</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              Payroll Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Process and disburse staff salaries</p>
          </div>
          <div className="flex gap-2">
            <BulkProcessButton month={selectedMonth} />
            <CreatePayrollForm staffList={staffProfiles || []} />
          </div>
        </div>
      </div>

      {/* Month Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[currentMonth, ...months.filter((m) => m !== currentMonth)].slice(0, 8).map((m) => (
          <Link
            key={m}
            href={`?month=${m}`}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${selectedMonth === m ? "bg-[#1d1d1f] text-white border-zinc-900" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            {new Date(m + "-01").toLocaleString("en-IN", { month: "short", year: "numeric" })}
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Payroll", value: fmt(totalAmount), color: "text-zinc-900 dark:text-zinc-100 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-zinc-800 dark:bg-indigo-950/30", border: "border-zinc-200/60" },
          { label: "Paid", value: fmt(paidAmount), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200/60" },
          { label: "Pending", value: fmt(pendingAmount), color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200/60" },
          { label: "Entries", value: monthPayroll.length, color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-50 dark:bg-slate-900/50", border: "border-slate-200/60" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border ${kpi.border} ${kpi.bg} p-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {totalAmount > 0 && (
        <div className="apple-card p-4">
          <div className="flex justify-between mb-2 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Disbursement Progress</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{Math.round((paidAmount / totalAmount) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
            <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700" style={{ width: `${Math.min(100, (paidAmount / totalAmount) * 100)}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-400">
            <span>Paid: {fmt(paidAmount)}</span>
            <span>Total: {fmt(totalAmount)}</span>
          </div>
        </div>
      )}

      {/* Payroll Table */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              {new Date(selectedMonth + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })} Payroll
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} entries</p>
          </div>
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
            {["all", "pending", "paid"].map((s) => (
              <Link key={s} href={`?month=${selectedMonth}&status=${s}`} className={`px-3 py-2 font-medium capitalize transition-colors ${statusFilter === s ? "bg-[#1d1d1f] text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                {s}
              </Link>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-800/50">
                {["Staff Member", "Basic", "Allowances", "Deductions", "Net Salary", "Status", "Action"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No payroll entries for this month.{" "}
                    <span className="text-zinc-900 dark:text-zinc-100 dark:text-zinc-300">Use "Bulk Process" to generate for all staff.</span>
                  </td>
                </tr>
              ) : (
                filtered.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.profiles?.full_name || "—"}</p>
                      <p className="text-xs text-slate-400">{p.profiles?.email}</p>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">{fmt(Number(p.basic_salary || p.amount))}</td>
                    <td className="py-3 px-4 text-sm text-emerald-600 dark:text-emerald-400">+{fmt(Number(p.allowances || 0))}</td>
                    <td className="py-3 px-4 text-sm text-rose-600 dark:text-rose-400">-{fmt(Number(p.deductions || 0))}</td>
                    <td className="py-3 px-4 text-sm font-bold text-slate-900 dark:text-slate-100">{fmt(Number(p.net_salary || p.amount))}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${p.status === "paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                        {p.status === "paid" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {p.status === "paid" ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {p.status === "pending" && <MarkPaidButton payrollId={p.id} />}
                      {p.status === "paid" && p.payment_date && (
                        <p className="text-xs text-slate-400">{p.payment_date}</p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
