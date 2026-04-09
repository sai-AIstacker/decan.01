import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LineChartWidget, BarChartWidget } from "@/components/ui/analytics-charts";
import { ExportCSVButton } from "@/components/ui/export-csv-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function MonthlyReportsPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: transactions } = await supabase.from("transactions").select("type, amount, transaction_date").order("transaction_date", { ascending: true });

  const monthlyRecord: Record<string, { income: number; expense: number }> = {};
  (transactions || []).forEach((transaction) => {
    const month = transaction.transaction_date?.substring(0, 7) ?? "Unknown";
    if (!monthlyRecord[month]) monthlyRecord[month] = { income: 0, expense: 0 };
    if (transaction.type === "income") monthlyRecord[month].income += Number(transaction.amount);
    else monthlyRecord[month].expense += Number(transaction.amount);
  });

  const monthlyData = Object.keys(monthlyRecord).sort().map((month) => ({
    month,
    income: monthlyRecord[month].income,
    expense: monthlyRecord[month].expense,
    net: monthlyRecord[month].income - monthlyRecord[month].expense,
  }));

  const totalIncome = monthlyData.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = monthlyData.reduce((sum, item) => sum + item.expense, 0);
  const totalNet = totalIncome - totalExpense;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Monthly Financial Report</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Review income and expense trends over monthly periods.</p>
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
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total expense</p>
          <p className="mt-3 text-3xl font-semibold text-rose-600 dark:text-rose-400">${totalExpense.toFixed(2)}</p>
        </div>
        <div className="apple-card">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Net profit</p>
          <p className="mt-3 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">${totalNet.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="apple-card">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Monthly trend</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Income vs expense variations</p>
            </div>
            <ExportCSVButton
              data={monthlyData}
              headers={[
                { key: "month", label: "Month" },
                { key: "income", label: "Income" },
                { key: "expense", label: "Expense" },
                { key: "net", label: "Net" },
              ]}
              fileName="monthly-financial-report.csv"
            />
          </div>
          <BarChartWidget data={monthlyData} xKey="month" yKey="income" fillColor="#22c55e" />
        </div>

        <div className="apple-card">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Profit over time</h2>
          <LineChartWidget data={monthlyData} xKey="month" yKey="net" strokeColor="#2563eb" />
        </div>
      </div>
    </div>
  );
}
