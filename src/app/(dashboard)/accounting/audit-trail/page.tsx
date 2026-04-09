import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FileText, ChevronRight, Plus, Minus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

export default async function AuditTrailPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: auditLogs, error } = await supabase
    .from("audit_trail")
    .select("*, profiles:changed_by(full_name, email)")
    .order("changed_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          Audit Trail
        </h1>
        <div className="rounded-3xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-8 text-center">
          <p className="text-orange-700 dark:text-orange-300 font-medium">Audit trail not yet available</p>
          <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">Run migration 014 in your Supabase dashboard to enable audit logging.</p>
        </div>
      </div>
    );
  }

  const logs = (auditLogs || []) as any[];

  const actionConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    INSERT: { label: "Created", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-900/40", icon: Plus },
    UPDATE: { label: "Updated", color: "text-zinc-900 dark:text-blue-300", bg: "bg-blue-100 dark:bg-zinc-800", icon: Pencil },
    DELETE: { label: "Deleted", color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-100 dark:bg-rose-900/40", icon: Minus },
  };

  const tableLabels: Record<string, string> = {
    transactions: "Transaction",
    invoices: "Invoice",
    expenses: "Expense",
    journal_entries: "Journal Entry",
    payments: "Payment",
  };

  const actionCounts = logs.reduce((acc: Record<string, number>, log: any) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});

  const tableCounts = logs.reduce((acc: Record<string, number>, log: any) => {
    const label = tableLabels[log.table_name] || log.table_name;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/accounting" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Finance</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Audit Trail</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          Audit Trail
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">All changes tracked — who changed what, when</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="apple-card p-4">
          <p className="text-xs text-slate-500 font-medium mb-1">Total Events</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{logs.length}</p>
        </div>
        {Object.entries(actionConfig).map(([action, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={action} className={`rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-4 ${cfg.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${cfg.color}`} />
                <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
              </div>
              <p className={`text-2xl font-bold ${cfg.color}`}>{actionCounts[action] || 0}</p>
            </div>
          );
        })}
      </div>

      {/* Table Breakdown */}
      {Object.keys(tableCounts).length > 0 && (
        <div className="apple-card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Changes by Entity</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(tableCounts).map(([table, count]) => (
              <span key={table} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium">
                {table} <span className="font-bold">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Change Log</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Last 50 events — newest first</p>
        </div>
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No audit events yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">All financial transactions will be logged here automatically.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((log: any) => {
              const cfg = actionConfig[log.action] || actionConfig.UPDATE;
              const ActionIcon = cfg.icon;
              const entityLabel = tableLabels[log.table_name] || log.table_name;
              const user = log.profiles as { full_name?: string; email?: string } | null;
              const changedAt = new Date(log.changed_at).toLocaleString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit"
              });
              return (
                <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                      <ActionIcon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <span className={`text-xs font-semibold ${cfg.color} mr-2`}>{cfg.label}</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{entityLabel}</span>
                          <span className="text-xs text-slate-400 ml-2 font-mono">{log.record_id.substring(0, 8)}…</span>
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{changedAt}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                        by <span className="font-medium text-slate-700 dark:text-slate-300">{user?.full_name || user?.email || "System"}</span>
                      </p>
                      {log.new_values && (
                        <div className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2 text-xs font-mono text-slate-500 dark:text-slate-400 max-h-16 overflow-y-auto">
                          {JSON.stringify(log.new_values, null, 0).substring(0, 150)}{JSON.stringify(log.new_values).length > 150 ? "…" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
