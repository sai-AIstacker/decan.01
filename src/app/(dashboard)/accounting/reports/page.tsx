import Link from "next/link";
import { LazyBarChart as BarChartWidget, LazyLineChart as LineChartWidget, LazyPieChart as PieChartWidget } from "@/components/ui/lazy-charts";

const overviewData = [
  { title: "Monthly", description: "View trend and comparison reports.", href: "/accounting/reports/monthly" },
  { title: "Yearly", description: "Inspect annual finance performance.", href: "/accounting/reports/yearly" },
  { title: "Profit & Loss", description: "Analyze net profit and categories.", href: "/accounting/reports/profit-loss" },
];

export default function AccountingReportsPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Financial Reports</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Choose a report to compare income, expense, and profitability across time.</p>
          </div>
          <Link href="/accounting" className="inline-flex items-center rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-700 transition hover:border-indigo-400 dark:border-zinc-800 dark:text-zinc-200">
            Back to dashboard
          </Link>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {overviewData.map((item) => (
          <Link key={item.href} href={item.href} className="apple-card p-6 transition">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Report</p>
            <h2 className="mt-3 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
