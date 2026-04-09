import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LineChartWidget } from "@/components/ui/analytics-charts";
import { ExportCSVButton } from "@/components/ui/export-csv-button";
import Link from "next/link";

export default async function YearlyReportsPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: transactions } = await supabase.from("transactions").select("type, amount, transaction_date").order("transaction_date", { ascending: true });

  const annualRecord: Record<string, { income: number; expense: number }> = {};
  (transactions || []).forEach((transaction) => {
    const year = transaction.transaction_date?.substring(0, 4) ?? "Unknown";
    if (!annualRecord[year]) annualRecord[year] = { income: 0, expense: 0 };
    if (transaction.type === "income") annualRecord[year].income += Number(transaction.amount);
    else annualRecord[year].expense += Number(transaction.amount);
  });

  const annualData = Object.keys(annualRecord).sort().map((year) => ({
    year,
    income: annualRecord[year].income,
    expense: annualRecord[year].expense,
    net: annualRecord[year].income - annualRecord[year].expense,
  }));

  const totalIncome = annualData.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = annualData.reduce((sum, item) => sum + item.expense, 0);
  const totalNet = totalIncome - totalExpense;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Yearly Financial Report</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Review annual performance summaries for income, expense, and profit.</p>
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

      <div className="apple-card">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Annual profit trend</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Net performance across completed years.</p>
          </div>
          <ExportCSVButton
            data={annualData}
            headers={[
              { key: "year", label: "Year" },
              { key: "income", label: "Income" },
              { key: "expense", label: "Expense" },
              { key: "net", label: "net" },
            ]}
            fileName="yearly-financial-report.csv"
          />
        </div>
        <LineChartWidget data={annualData} xKey="year" yKey="net" strokeColor="#0ea5e9" />
      </div>
    </div>
  );
}
