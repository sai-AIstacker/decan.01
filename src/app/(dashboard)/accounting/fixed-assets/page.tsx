import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Building2 as BuildingIcon, ChevronRight, TrendingDown, CheckCircle2, XCircle, Wrench, Plus } from "lucide-react";
import Link from "next/link";
import { CreateAssetForm } from "./ui/create-asset-form";
import { RunDepreciationButton } from "./ui/run-depreciation-button";

const fmt = (v: number) =>
  `₹${Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  disposed: { label: "Disposed", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", icon: XCircle },
  under_maintenance: { label: "Maintenance", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Wrench },
  fully_depreciated: { label: "Fully Depreciated", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", icon: TrendingDown },
};

const ASSET_CATEGORIES = [
  "Furniture & Fixtures",
  "Computer & IT Equipment",
  "Laboratory Equipment",
  "Sports Equipment",
  "Library Books",
  "Vehicles",
  "Buildings & Infrastructure",
  "Office Equipment",
  "Musical Instruments",
  "Other",
];

export default async function FixedAssetsPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: assets, error } = await supabase
    .from("fixed_assets")
    .select("*, cost_centers(name)")
    .order("asset_code");

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg">
              <BuildingIcon className="w-5 h-5 text-white" />
            </div>
            Fixed Assets
          </h1>
          <CreateAssetForm categories={ASSET_CATEGORIES} />
        </div>
        <div className="rounded-3xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-8 text-center">
          <p className="text-orange-700 dark:text-orange-300 font-medium">Fixed Assets table not yet available</p>
          <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">Run migration 014 in your Supabase dashboard to enable fixed assets.</p>
        </div>
      </div>
    );
  }

  const allAssets = (assets || []) as any[];

  const totalCost = allAssets.reduce((s, a) => s + Number(a.purchase_cost), 0);
  const totalAccumDep = allAssets.reduce((s, a) => s + Number(a.accumulated_depreciation), 0);
  const totalNetBookValue = allAssets.reduce((s, a) => s + Number(a.current_book_value ?? (Number(a.purchase_cost) - Number(a.accumulated_depreciation))), 0);
  const activeAssets = allAssets.filter((a) => a.status === "active");

  const statusCounts = allAssets.reduce((acc: Record<string, number>, a: any) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  // Category breakdown
  const byCategory = allAssets.reduce((acc: Record<string, { count: number; cost: number; bookValue: number }>, a: any) => {
    const cat = a.category || "Other";
    if (!acc[cat]) acc[cat] = { count: 0, cost: 0, bookValue: 0 };
    acc[cat].count += 1;
    acc[cat].cost += Number(a.purchase_cost);
    acc[cat].bookValue += Number(a.current_book_value ?? (Number(a.purchase_cost) - Number(a.accumulated_depreciation)));
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/accounting" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Finance</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Fixed Assets</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg">
                <BuildingIcon className="w-5 h-5 text-white" />
              </div>
              Fixed Assets Register
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Asset register with depreciation tracking and lifecycle management</p>
          </div>
          <CreateAssetForm categories={ASSET_CATEGORIES} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Asset Cost", value: fmt(totalCost), color: "text-zinc-900 dark:text-zinc-100 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-zinc-800 dark:bg-indigo-950/30", border: "border-zinc-200/60" },
          { label: "Accum. Depreciation", value: fmt(totalAccumDep), color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200/60" },
          { label: "Net Book Value", value: fmt(totalNetBookValue), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200/60" },
          { label: "Active Assets", value: activeAssets.length, color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-50 dark:bg-slate-900/50", border: "border-slate-200/60" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border ${kpi.border} ${kpi.bg} p-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Status + Category Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status */}
        <div className="apple-card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Asset Status</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(statusConfig).map(([status, cfg]) => {
              const Icon = cfg.icon;
              const bgClass = cfg.color.split(" ").filter((c) => c.startsWith("bg-") || c.includes("dark:bg")).join(" ");
              return (
                <div key={status} className={`rounded-2xl p-4 ${bgClass}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-semibold">{cfg.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{statusCounts[status] || 0}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="apple-card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">By Category</h2>
          {Object.keys(byCategory).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No assets yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(byCategory)
                .sort((a, b) => b[1].cost - a[1].cost)
                .slice(0, 6)
                .map(([cat, data]) => {
                  const depPct = data.cost > 0 ? Math.round(((data.cost - data.bookValue) / data.cost) * 100) : 0;
                  return (
                    <div key={cat} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{cat}</p>
                        <p className="text-xs text-slate-400">{data.count} assets · {depPct}% depreciated</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fmt(data.bookValue)}</p>
                        <p className="text-xs text-slate-400">of {fmt(data.cost)}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Assets Table */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Asset Register</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{allAssets.length} assets tracked</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-800/50">
                {["Code", "Asset Name", "Category", "Cost", "Accum. Dep.", "Book Value", "Method", "Status", "Action"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    No fixed assets found. Add your first asset using the button above.
                  </td>
                </tr>
              ) : (
                allAssets.map((asset: any) => {
                  const scfg = statusConfig[asset.status] || statusConfig.active;
                  const StatusIcon = scfg.icon;
                  const bookValue = Number(asset.current_book_value ?? (Number(asset.purchase_cost) - Number(asset.accumulated_depreciation)));
                  const depPct = Number(asset.purchase_cost) > 0
                    ? Math.round((Number(asset.accumulated_depreciation) / Number(asset.purchase_cost)) * 100)
                    : 0;
                  return (
                    <tr key={asset.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-zinc-900 dark:text-zinc-100 dark:text-zinc-300 whitespace-nowrap">{asset.asset_code}</td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{asset.name}</p>
                        {asset.location && <p className="text-xs text-slate-400">{asset.location}</p>}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{asset.category}</td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{fmt(Number(asset.purchase_cost))}</td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-rose-600 dark:text-rose-400 whitespace-nowrap">{fmt(Number(asset.accumulated_depreciation))}</p>
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1 mt-1">
                          <div className="h-1 rounded-full bg-rose-400 transition-all" style={{ width: `${depPct}%` }} />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">{fmt(bookValue)}</td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 capitalize whitespace-nowrap">
                        {asset.depreciation_method?.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${scfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {scfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {asset.status === "active" && (
                          <RunDepreciationButton assetId={asset.id} assetName={asset.name} />
                        )}
                      </td>
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
