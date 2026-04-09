import { Suspense } from "react";
import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Wallet, ArrowDownRight, Activity, AlertTriangle,
  TrendingUp, TrendingDown, BookOpen, BarChart3, Building2,
  Users, Target, ArrowUpRight, Layers, Scale, FileText, Banknote
} from "lucide-react";
import Link from "next/link";
import { KPICard } from "@/components/ui/dashboard-kpi-card";
import { KPICarousel } from "@/components/ui/kpi-carousel";
import { AccountingChartsClient } from "./ui/accounting-charts-client";

const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const modules = [
  { href: "/accounting/chart-of-accounts",  label: "Chart of Accounts", icon: Layers },
  { href: "/accounting/financial-statements",label: "Statements",        icon: Scale },
  { href: "/accounting/receivables",         label: "Receivables",       icon: TrendingUp },
  { href: "/accounting/payables",            label: "Payables",          icon: TrendingDown },
  { href: "/accounting/bank",                label: "Bank & Cash",       icon: Building2 },
  { href: "/accounting/budgets",             label: "Budgets",           icon: Target },
  { href: "/accounting/journals",            label: "Journals",          icon: BookOpen },
  { href: "/accounting/fixed-assets",        label: "Fixed Assets",      icon: Building2 },
  { href: "/accounting/cost-centers",        label: "Cost Centers",      icon: Layers },
  { href: "/accounting/fee-management",      label: "Fee Management",    icon: Users },
  { href: "/accounting/audit-trail",         label: "Audit Trail",       icon: FileText },
  { href: "/accounting/advanced-reports",    label: "Reports",           icon: BarChart3 },
];

export default async function AccountingDashboardPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: transactions }, { data: invoices }, { data: bankAccounts }] = await Promise.all([
    supabase.from("transactions").select("id,type,amount,description,transaction_date").order("transaction_date", { ascending: false }).limit(100),
    supabase.from("invoices").select("id,amount,status,due_date,title,created_at"),
    supabase.from("bank_accounts").select("id,name,bank_name,current_balance,is_active").eq("is_active", true),
  ]);

  const txns = transactions || [];
  const invs  = invoices    || [];

  let totalIncome = 0, totalExpense = 0;
  txns.forEach(t => {
    const amt = Number(t.amount);
    if (t.type === "income") totalIncome += amt; else totalExpense += amt;
  });

  const now = new Date();
  let totalReceivable = 0, overdueReceivable = 0, pendingInvoices = 0;
  invs.forEach(inv => {
    if (inv.status === "pending" || inv.status === "overdue") {
      totalReceivable += Number(inv.amount); pendingInvoices++;
      if (new Date(inv.due_date) < now) overdueReceivable += Number(inv.amount);
    }
  });

  const totalCash = (bankAccounts || []).reduce((s, b) => s + Number(b.current_balance), 0);
  const netProfit = totalIncome - totalExpense;

  // Monthly trend data
  const monthlyTotals: Record<string, { income: number; expense: number }> = {};
  txns.forEach(t => {
    const amt = Number(t.amount);
    const m   = t.transaction_date?.substring(0, 7) || "Unknown";
    if (!monthlyTotals[m]) monthlyTotals[m] = { income: 0, expense: 0 };
    if (t.type === "income") monthlyTotals[m].income += amt; else monthlyTotals[m].expense += amt;
  });
  const revExpTrend = Object.keys(monthlyTotals).sort().slice(-6).map(m => ({
    name: new Date(m + "-01").toLocaleString("en", { month: "short" }),
    Revenue: monthlyTotals[m].income,
    Expenses: monthlyTotals[m].expense,
  }));

  // Cash trend (cumulative)
  let running = 0;
  const cashTrend = Object.keys(monthlyTotals).sort().slice(-6).map(m => {
    running += monthlyTotals[m].income - monthlyTotals[m].expense;
    return { name: new Date(m + "-01").toLocaleString("en", { month: "short" }), Cash: running };
  });

  // Calendar events — overdue invoices
  const calendarEvents = invs
    .filter(i => i.status === "pending" || i.status === "overdue")
    .slice(0, 10)
    .map(i => ({
      date: i.due_date,
      label: i.title || "Invoice due",
      color: (new Date(i.due_date) < now ? "red" : "amber") as "red" | "amber",
    }));

  const revSparkline = Object.keys(monthlyTotals).sort().slice(-6).map(m => monthlyTotals[m].income);
  const expSparkline = Object.keys(monthlyTotals).sort().slice(-6).map(m => monthlyTotals[m].expense);

  return (
    <div className="space-y-6 fade-up">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="label-xs mb-1">Finance & Accounting</p>
          <h1 className="text-[22px] lg:text-[26px] font-black tracking-tight text-[var(--foreground)]" style={{ fontFamily: "var(--font-jakarta)" }}>
            Financial Overview
          </h1>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="apple-card px-4 py-2.5 text-center">
            <p className="label-xs mb-1">Cash Position</p>
            <p className="text-[16px] font-black mono-num text-[#34c759]">{fmt(totalCash)}</p>
          </div>
          <div className="apple-card px-4 py-2.5 text-center">
            <p className="label-xs mb-1">Net Profit</p>
            <p className={`text-[16px] font-black mono-num ${netProfit >= 0 ? "text-[#007aff]" : "text-[#ff3b30]"}`}>{fmt(netProfit)}</p>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <KPICarousel cols={6}>
        <KPICard title="Total Revenue"  value={fmt(totalIncome)}      icon={TrendingUp}   color="green"  sparkline={revSparkline} trend={{ value: 6, isPositive: true }} />
        <KPICard title="Total Expenses" value={fmt(totalExpense)}     icon={TrendingDown} color="red"    sparkline={expSparkline} trend={{ value: 2, isPositive: false }} />
        <KPICard title="Net Profit"     value={fmt(netProfit)}        icon={Activity}     color={netProfit >= 0 ? "indigo" : "red"} trend={{ value: 4, isPositive: netProfit >= 0 }} />
        <KPICard title="Receivables"    value={fmt(totalReceivable)}  icon={ArrowUpRight} color="amber"  description={`${pendingInvoices} open`} />
        <KPICard title="Overdue"        value={fmt(overdueReceivable)}icon={AlertTriangle}color="red"    description="Needs attention" />
        <KPICard title="Cash Position"  value={fmt(totalCash)}        icon={Wallet}       color="teal"   description={`${(bankAccounts||[]).length} accounts`} />
      </KPICarousel>

      {/* ── Charts + Calendar ── */}
      <AccountingChartsClient
        revExpTrend={revExpTrend}
        cashTrend={cashTrend}
        calendarEvents={calendarEvents}
        recentTxns={txns.slice(0, 7)}
      />

      {/* ── Receivables Aging ── */}
      <div className="apple-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[14px] font-bold text-[var(--foreground)]">Receivables Aging</p>
            <p className="label-xs mt-0.5">Outstanding by days overdue</p>
          </div>
          <Link href="/accounting/receivables" className="btn-ghost text-[12px]">Details <ArrowUpRight size={11} /></Link>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {(() => {
            const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
            invs.filter(i => i.status !== "paid").forEach(inv => {
              const days = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000);
              const amt  = Number(inv.amount);
              if (days <= 0) buckets.current += amt;
              else if (days <= 30) buckets.d30 += amt;
              else if (days <= 60) buckets.d60 += amt;
              else if (days <= 90) buckets.d90 += amt;
              else buckets.d90plus += amt;
            });
            const total = Object.values(buckets).reduce((a,b) => a+b, 0) || 1;
            return [
              { label: "Current",   value: buckets.current,  color: "#34c759", bg: "bg-[#34c759]" },
              { label: "1–30 days", value: buckets.d30,      color: "#ff9f0a", bg: "bg-[#ff9f0a]" },
              { label: "31–60 days",value: buckets.d60,      color: "#ff6b00", bg: "bg-[#ff6b00]" },
              { label: "61–90 days",value: buckets.d90,      color: "#ff3b30", bg: "bg-[#ff3b30]" },
              { label: "90+ days",  value: buckets.d90plus,  color: "#cc0000", bg: "bg-[#cc0000]" },
            ].map(row => (
              <div key={row.label} className="text-center">
                <div className="h-20 bg-[var(--surface-2)] rounded-[10px] overflow-hidden flex flex-col justify-end mb-2">
                  <div className={`${row.bg} rounded-[10px] transition-all duration-700`}
                    style={{ height: `${Math.max(4, Math.round((row.value / total) * 100))}%` }} />
                </div>
                <p className="text-[11px] font-black mono-num" style={{ color: row.color }}>{fmt(row.value)}</p>
                <p className="text-[9px] text-[var(--muted-foreground)] mt-0.5 font-semibold">{row.label}</p>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* ── Bank Accounts ── */}
      {bankAccounts && bankAccounts.length > 0 && (
        <div className="apple-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[14px] font-bold text-[var(--foreground)]">Bank Accounts</p>
            <Link href="/accounting/bank" className="btn-ghost text-[12px]">Manage <ArrowUpRight size={11} /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bankAccounts.map(acct => (
              <div key={acct.id} className="rounded-[14px] border-2 border-[var(--border)] bg-[var(--surface-2)] p-4 hover:border-[var(--foreground)] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote size={13} className="text-[var(--muted-foreground)]" />
                  <p className="text-[12px] font-semibold text-[var(--foreground)] truncate">{acct.name}</p>
                </div>
                <p className="text-[20px] font-black text-[var(--foreground)] mono-num">{fmt(Number(acct.current_balance))}</p>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 font-medium">{acct.bank_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Finance Modules ── */}
      <div>
        <p className="label-xs mb-3">Finance Modules</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
          {modules.map(m => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href}
                className="apple-card flex flex-col items-center gap-2 p-3 hover:bg-[var(--surface-2)] transition-colors group press-scale">
                <div className="w-8 h-8 rounded-[10px] bg-[var(--surface-2)] flex items-center justify-center group-hover:bg-[#1d1d1f] transition-colors">
                  <Icon size={14} className="text-[var(--foreground)] group-hover:text-white transition-colors" />
                </div>
                <p className="text-[9px] font-semibold text-[var(--muted-foreground)] text-center leading-tight">{m.label}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
import {
  Wallet, ArrowDownRight, Activity, CreditCard, AlertTriangle,
  TrendingUp, TrendingDown, BookOpen, BarChart3, Building2,
  Users, Target, ArrowUpRight, Layers, Scale, FileText, Banknote
} from "lucide-react";
import Link from "next/link";
import { LazyBarChart as BarChartWidget, LazyPieChart as PieChartWidget } from "@/components/ui/lazy-charts";
import { KPICard } from "@/components/ui/dashboard-kpi-card";
import { KPICarousel } from "@/components/ui/kpi-carousel";

const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const modules = [
  { href: "/accounting/chart-of-accounts", label: "Chart of Accounts", icon: Layers },
  { href: "/accounting/financial-statements", label: "Statements", icon: Scale },
  { href: "/accounting/receivables", label: "Receivables", icon: TrendingUp },
  { href: "/accounting/payables", label: "Payables", icon: TrendingDown },
  { href: "/accounting/bank", label: "Bank & Cash", icon: Building2 },
  { href: "/accounting/budgets", label: "Budgets", icon: Target },
  { href: "/accounting/journals", label: "Journals", icon: BookOpen },
  { href: "/accounting/fixed-assets", label: "Fixed Assets", icon: Building2 },
  { href: "/accounting/cost-centers", label: "Cost Centers", icon: Layers },
  { href: "/accounting/fee-management", label: "Fee Management", icon: Users },
  { href: "/accounting/audit-trail", label: "Audit Trail", icon: FileText },
  { href: "/accounting/advanced-reports", label: "Reports", icon: BarChart3 },
];

function ChartSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3 apple-card p-5 space-y-4 animate-pulse">
        <div className="h-4 w-32 rounded-lg bg-[var(--surface-2)]" />
        <div className="h-48 rounded-xl bg-[var(--surface-2)]" />
      </div>
      <div className="lg:col-span-2 apple-card p-5 space-y-4 animate-pulse">
        <div className="h-4 w-24 rounded-lg bg-[var(--surface-2)]" />
        <div className="h-48 rounded-xl bg-[var(--surface-2)]" />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1].map(i => (
        <div key={i} className="apple-card overflow-hidden animate-pulse">
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
            <div className="h-4 w-32 rounded-lg bg-[var(--surface-2)]" />
          </div>
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-3 w-full rounded-full bg-[var(--surface-2)]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Streamed: Charts ──
async function AccountingCharts({ transactions, invoices }: { transactions: any[]; invoices: any[] }) {
  const monthlyTotals: Record<string, { income: number; expense: number }> = {};
  transactions.forEach(t => {
    const amt = Number(t.amount);
    const month = t.transaction_date?.substring(0, 7) || "Unknown";
    if (!monthlyTotals[month]) monthlyTotals[month] = { income: 0, expense: 0 };
    if (t.type === "income") { monthlyTotals[month].income += amt; }
    else { monthlyTotals[month].expense += amt; }
  });

  const chartData = Object.keys(monthlyTotals).sort().slice(-6).map(m => ({
    name: m.substring(5), Revenue: monthlyTotals[m].income, Expenses: monthlyTotals[m].expense,
  }));

  const invoicePie = [
    { name: "Paid", value: invoices.filter(i => i.status === "paid").length },
    { name: "Pending", value: invoices.filter(i => i.status === "pending").length },
    { name: "Overdue", value: invoices.filter(i => i.status === "overdue").length },
  ].filter(d => d.value > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3 apple-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[14px] font-semibold text-[var(--foreground)]">Revenue vs Expenses</p>
            <p className="label-xs mt-0.5">Last 6 months</p>
          </div>
          <Link href="/accounting/financial-statements" className="btn-ghost">P&amp;L <ArrowUpRight size={11} /></Link>
        </div>
        <div className="h-40 lg:h-48">
          {chartData.length > 0
            ? <BarChartWidget data={chartData} xKey="name" yKey="Revenue" fillColor="#34c759" />
            : <div className="h-full flex items-center justify-center text-[var(--muted-foreground)] text-sm">No data yet</div>}
        </div>
      </div>

      <div className="lg:col-span-2 apple-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[14px] font-semibold text-[var(--foreground)]">Invoice Status</p>
            <p className="label-xs mt-0.5">Collection overview</p>
          </div>
          <Link href="/accounting/receivables" className="btn-ghost">View <ArrowUpRight size={11} /></Link>
        </div>
        <div className="h-40 lg:h-48">
          {invoicePie.length > 0
            ? <PieChartWidget data={invoicePie} colors={["#34c759", "#ff9f0a", "#ff3b30"]} />
            : <div className="h-full flex items-center justify-center text-[var(--muted-foreground)] text-sm">No data yet</div>}
        </div>
      </div>
    </div>
  );
}

// ── Streamed: Aging + Transactions ──
async function AccountingLists({ transactions, invoices }: { transactions: any[]; invoices: any[] }) {
  const now = new Date();
  const agingBuckets = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
  invoices.filter(i => i.status !== "paid").forEach(inv => {
    const days = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000);
    const amt = Number(inv.amount);
    if (days <= 0) agingBuckets.current += amt;
    else if (days <= 30) agingBuckets.d30 += amt;
    else if (days <= 60) agingBuckets.d60 += amt;
    else if (days <= 90) agingBuckets.d90 += amt;
    else agingBuckets.d90plus += amt;
  });

  const recentTxns = transactions.slice(0, 7);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Aging */}
      <div className="apple-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[14px] font-semibold text-[var(--foreground)]">Receivables Aging</p>
            <p className="label-xs mt-0.5">Outstanding by days overdue</p>
          </div>
          <Link href="/accounting/receivables" className="btn-ghost">Details <ArrowUpRight size={11} /></Link>
        </div>
        <div className="space-y-3.5">
          {[
            { label: "Current", value: agingBuckets.current, bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
            { label: "1–30 days", value: agingBuckets.d30, bar: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" },
            { label: "31–60 days", value: agingBuckets.d60, bar: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
            { label: "61–90 days", value: agingBuckets.d90, bar: "bg-red-500", text: "text-red-500" },
            { label: "90+ days", value: agingBuckets.d90plus, bar: "bg-red-700", text: "text-red-700 dark:text-red-400" },
          ].map(row => {
            const total = Object.values(agingBuckets).reduce((a, b) => a + b, 0) || 1;
            const pct = Math.round((row.value / total) * 100);
            return (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] text-[var(--muted-foreground)]">{row.label}</span>
                  <span className={`text-[12px] font-semibold mono-num ${row.text}`}>{fmt(row.value)}</span>
                </div>
                <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${row.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transactions */}
      <div className="apple-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[var(--foreground)]">Recent Transactions</p>
            <p className="label-xs mt-0.5">Latest activity</p>
          </div>
          <Link href="/accounting/ledger" className="btn-ghost">Ledger <ArrowUpRight size={11} /></Link>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {recentTxns.length === 0
            ? <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No transactions yet</p>
            : recentTxns.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-2)] transition-colors">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${t.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  {t.type === "income"
                    ? <ArrowUpRight size={13} className="text-emerald-600 dark:text-emerald-400" />
                    : <ArrowDownRight size={13} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[var(--foreground)] truncate">{t.description}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">{t.transaction_date?.substring(0, 10)}</p>
                </div>
                <span className={`text-[13px] font-bold mono-num ${t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                  {t.type === "income" ? "+" : "−"}{fmt(Number(t.amount))}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default async function AccountingDashboardPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: transactions }, { data: invoices }, { data: bankAccounts }] = await Promise.all([
    supabase.from("transactions").select("id, type, amount, description, transaction_date").order("transaction_date", { ascending: false }).limit(100),
    supabase.from("invoices").select("id, amount, status, due_date, created_at"),
    supabase.from("bank_accounts").select("id, name, bank_name, current_balance, is_active").eq("is_active", true),
  ]);

  const txns = transactions || [];
  const invs = invoices || [];

  let totalIncome = 0, totalExpense = 0;
  txns.forEach(t => {
    const amt = Number(t.amount);
    if (t.type === "income") totalIncome += amt;
    else totalExpense += amt;
  });

  const now = new Date();
  let totalReceivable = 0, overdueReceivable = 0, pendingInvoices = 0;
  invs.forEach(inv => {
    if (inv.status === "pending" || inv.status === "overdue") {
      totalReceivable += Number(inv.amount); pendingInvoices++;
      if (new Date(inv.due_date) < now) overdueReceivable += Number(inv.amount);
    }
  });

  const totalCash = (bankAccounts || []).reduce((s, b) => s + Number(b.current_balance), 0);
  const netProfit = totalIncome - totalExpense;

  // Sparklines for KPIs
  const monthlyTotals: Record<string, { income: number; expense: number }> = {};
  txns.forEach(t => {
    const amt = Number(t.amount);
    const month = t.transaction_date?.substring(0, 7) || "Unknown";
    if (!monthlyTotals[month]) monthlyTotals[month] = { income: 0, expense: 0 };
    if (t.type === "income") monthlyTotals[month].income += amt;
    else monthlyTotals[month].expense += amt;
  });
  const revSparkline = Object.keys(monthlyTotals).sort().slice(-6).map(m => monthlyTotals[m].income);
  const expSparkline = Object.keys(monthlyTotals).sort().slice(-6).map(m => monthlyTotals[m].expense);

  return (
    <div className="space-y-6 fade-up">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="label-xs mb-1">Finance & Accounting</p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Financial Overview</h1>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">Real-time financial intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="apple-card px-4 py-2.5 text-center min-w-[110px]">
            <p className="label-xs mb-1">Cash Position</p>
            <p className="text-base font-bold mono-num text-emerald-600 dark:text-emerald-400">{fmt(totalCash)}</p>
          </div>
          <div className="apple-card px-4 py-2.5 text-center min-w-[110px]">
            <p className="label-xs mb-1">Net Profit</p>
            <p className={`text-base font-bold mono-num ${netProfit >= 0 ? "text-[var(--accent-indigo)]" : "text-red-500"}`}>{fmt(netProfit)}</p>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <KPICarousel cols={6}>
        <KPICard title="Total Revenue" value={fmt(totalIncome)} icon={TrendingUp} color="green" sparkline={revSparkline} trend={{ value: 6, isPositive: true }} />
        <KPICard title="Total Expenses" value={fmt(totalExpense)} icon={TrendingDown} color="red" sparkline={expSparkline} trend={{ value: 2, isPositive: false }} />
        <KPICard title="Net Profit" value={fmt(netProfit)} icon={Activity} color={netProfit >= 0 ? "indigo" : "red"} trend={{ value: 4, isPositive: netProfit >= 0 }} />
        <KPICard title="Receivables" value={fmt(totalReceivable)} icon={ArrowUpRight} color="amber" description={`${pendingInvoices} open`} />
        <KPICard title="Overdue" value={fmt(overdueReceivable)} icon={AlertTriangle} color="red" description="Needs attention" />
        <KPICard title="Cash Position" value={fmt(totalCash)} icon={Wallet} color="teal" description={`${(bankAccounts || []).length} accounts`} />
      </KPICarousel>

      {/* ── Charts (streamed) ── */}
      <Suspense fallback={<ChartSkeleton />}>
        <AccountingCharts transactions={txns} invoices={invs} />
      </Suspense>

      {/* ── Aging + Transactions (streamed) ── */}
      <Suspense fallback={<ListSkeleton />}>
        <AccountingLists transactions={txns} invoices={invs} />
      </Suspense>

      {/* ── Bank Accounts ── */}
      {bankAccounts && bankAccounts.length > 0 && (
        <div className="apple-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[14px] font-semibold text-[var(--foreground)]">Bank Accounts</p>
            <Link href="/accounting/bank" className="btn-ghost">Manage <ArrowUpRight size={11} /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bankAccounts.map((acct, i) => (
              <div key={acct.id} className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote size={13} className="text-[var(--foreground)]" />
                  <p className="text-[12px] font-medium text-[var(--foreground)] truncate">{acct.name}</p>
                </div>
                <p className="text-[18px] font-bold text-[var(--foreground)] mono-num">{fmt(Number(acct.current_balance))}</p>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{acct.bank_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modules ── */}
      <div>
        <p className="label-xs mb-3">Finance Modules</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
          {modules.map(m => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href}
                className="apple-card flex flex-col items-center gap-2 p-3 hover:bg-[var(--surface-2)] transition-colors group">
                <div className="w-8 h-8 rounded-[10px] bg-[var(--surface-2)] flex items-center justify-center group-hover:bg-[var(--foreground)] transition-colors">
                  <Icon size={14} className="text-[var(--foreground)] group-hover:text-[var(--background)] transition-colors" />
                </div>
                <p className="text-[9px] font-medium text-[var(--muted-foreground)] text-center leading-tight">{m.label}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
