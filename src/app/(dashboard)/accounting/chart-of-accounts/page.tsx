import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Layers, ChevronRight, TrendingUp, TrendingDown, Scale, PiggyBank, DollarSign, Plus } from "lucide-react";
import Link from "next/link";
import { CreateAccountForm } from "./ui/create-account-form";

const accountTypeConfig: Record<string, { label: string; color: string; bg: string; icon: any; description: string }> = {
  asset: { label: "Asset", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-900/40", icon: TrendingUp, description: "Resources owned by the school" },
  liability: { label: "Liability", color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-100 dark:bg-rose-900/40", icon: TrendingDown, description: "Obligations owed by the school" },
  equity: { label: "Equity", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-100 dark:bg-purple-900/40", icon: Scale, description: "Net worth / school fund" },
  revenue: { label: "Revenue", color: "text-zinc-900 dark:text-blue-300", bg: "bg-blue-100 dark:bg-zinc-800", icon: PiggyBank, description: "Income earned by the school" },
  expense: { label: "Expense", color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-100 dark:bg-orange-900/40", icon: DollarSign, description: "Costs incurred by the school" },
};

type CoaAccount = {
  id: string;
  account_code: string;
  name: string;
  account_type: string;
  parent_id: string | null;
  description: string | null;
  status: string;
  is_system: boolean;
  children?: CoaAccount[];
};

function buildTree(accounts: CoaAccount[], parentId: string | null = null): CoaAccount[] {
  return accounts
    .filter((a) => a.parent_id === parentId)
    .map((a) => ({ ...a, children: buildTree(accounts, a.id) }));
}

function AccountRow({ account, depth = 0 }: { account: CoaAccount; depth?: number }) {
  const cfg = accountTypeConfig[account.account_type] || accountTypeConfig.asset;
  const isParent = (account.children?.length ?? 0) > 0;

  return (
    <>
      <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
        <td className="py-3 px-4">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
            {isParent ? <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <span className="w-4 flex-shrink-0" />}
            <span className={`text-sm ${isParent ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"}`}>
              {account.name}
            </span>
            {account.is_system && (
              <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">System</span>
            )}
          </div>
        </td>
        <td className="py-3 px-4 text-sm font-mono text-slate-500 dark:text-slate-400">{account.account_code}</td>
        <td className="py-3 px-4">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </span>
        </td>
        <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">{account.description || "—"}</td>
        <td className="py-3 px-4">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${account.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
            {account.status}
          </span>
        </td>
      </tr>
      {account.children?.map((child) => (
        <AccountRow key={child.id} account={child} depth={depth + 1} />
      ))}
    </>
  );
}

export default async function ChartOfAccountsPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .order("account_code");

  const allAccounts = (accounts || []) as CoaAccount[];
  const tree = buildTree(allAccounts);

  // Group by type for summary
  const byType = allAccounts.reduce((acc: Record<string, number>, a) => {
    acc[a.account_type] = (acc[a.account_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/accounting" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Finance</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Chart of Accounts</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Layers className="w-5 h-5 text-white" />
              </div>
              Chart of Accounts
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Hierarchical account structure for double-entry bookkeeping</p>
          </div>
          <CreateAccountForm accounts={allAccounts} />
        </div>
      </div>

      {/* Account Type Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {Object.entries(accountTypeConfig).map(([type, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={type} className={`rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-4 ${cfg.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${cfg.color}`} />
                <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
              </div>
              <p className={`text-2xl font-bold ${cfg.color}`}>{byType[type] || 0}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cfg.description}</p>
            </div>
          );
        })}
      </div>

      {/* Accounts Table */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Account Hierarchy</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{allAccounts.length} accounts total</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-800/50">
                {["Account Name", "Code", "Type", "Description", "Status"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No accounts found. Add your first account using the button above.
                  </td>
                </tr>
              ) : (
                tree.map((account) => <AccountRow key={account.id} account={account} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
