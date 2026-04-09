import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PieChartWidget } from "@/components/ui/analytics-charts";
import { ExportCSVButton } from "@/components/ui/export-csv-button";
import Link from "next/link";

export default async function ProfitLossPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: transactions } = await supabase.from("transactions").select("type, amount, category_id");
  const { data: categories } = await supabase.from("finance_categories").select("id, name, type");

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals: Record<string, { label: string; type: string; total: number }> = {};

  (transactions || []).forEach((transaction) => {
    const amount = Number(transaction.amount);
    if (transaction.type === "income") totalIncome += amount;
    else totalExpense += amount;

    const categoryName = categories?.find((category) => category.id === transaction.category_id)?.name || "Uncategorized";
    const categoryType = categories?.find((category) => category.id === transaction.category_id)?.type || transaction.type;
    const key = `${categoryType}:${categoryName}`;

    if (!categoryTotals[key]) {
      categoryTotals[key] = { label: `${categoryName} (${categoryType})`, type: categoryType, total: 0 };
    }
    categoryTotals[key].total += amount;
  });

  const profit = totalIncome - totalExpense;
  const pieData = Object.values(categoryTotals).map((item) => ({ name: item.label, value: item.total }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Profit & Loss</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Analyze net profit and category-level performance.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/accounting/reports" className="inline-flex items-center rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">Back to reports</Link>
            <Link href="/accounting" className="inline-flex items-center rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">Dashboard</Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="apple-card">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total income</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-600 dark:text-emerald-400">${totalIncome.toFixed(2)}</p>
        </div>
        <div className="apple-card">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total expenses</p>
          <p className="mt-3 text-3xl font-semibold text-rose-600 dark:text-rose-400">${totalExpense.toFixed(2)}</p>
        </div>
        <div className="apple-card">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Net profit</p>
          <p className="mt-3 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">${profit.toFixed(2)}</p>
        </div>
      </div>

      <div className="apple-card">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Category performance</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Income and expense distribution by category.</p>
          </div>
          <ExportCSVButton
            data={pieData}
            headers={[
              { key: "name", label: "Category" },
              { key: "value", label: "Total" },
            ]}
            fileName="profit-loss-category-breakdown.csv"
          />
        </div>
        <PieChartWidget data={pieData} />
      </div>
    </div>
  );
}
