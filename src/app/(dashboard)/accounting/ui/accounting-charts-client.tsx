"use client";

import { PremiumLineChart } from "@/components/ui/premium-line-chart";
import { MiniCalendar } from "@/components/ui/mini-calendar";
import { SectionHeader } from "@/components/ui/section-header";
import { TrendingUp, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";

const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

interface Props {
  revExpTrend: { name: string; Revenue: number; Expenses: number }[];
  cashTrend:   { name: string; Cash: number }[];
  calendarEvents: { date: string; label: string; color: "blue"|"green"|"red"|"amber"|"purple" }[];
  recentTxns: any[];
}

export function AccountingChartsClient({ revExpTrend, cashTrend, calendarEvents, recentTxns }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">

      {/* Revenue vs Expenses */}
      <div className="apple-card p-4 lg:p-5">
        <SectionHeader title="Revenue vs Expenses" subtitle="6-month trend" icon={TrendingUp} href="/accounting/financial-statements" hrefLabel="P&L" className="mb-4" />
        {revExpTrend.length > 0 ? (
          <PremiumLineChart
            data={revExpTrend}
            lines={[
              { key: "Revenue",  color: "#34c759", label: "Revenue" },
              { key: "Expenses", color: "#ff3b30", label: "Expenses" },
            ]}
            xKey="name"
            height={180}
            filled
          />
        ) : (
          <div className="h-[180px] flex items-center justify-center text-[13px] text-[var(--muted-foreground)]">No data yet</div>
        )}
        <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--border)]">
          <div className="flex-1 rounded-[12px] bg-[#34c759]/8 border border-[#34c759]/15 p-2.5 text-center">
            <p className="label-xs text-[#34c759]">Revenue</p>
            <p className="text-[13px] font-black text-[#34c759] mono-num mt-0.5">{fmt(revExpTrend.reduce((s,r)=>s+r.Revenue,0))}</p>
          </div>
          <div className="flex-1 rounded-[12px] bg-[#ff3b30]/8 border border-[#ff3b30]/15 p-2.5 text-center">
            <p className="label-xs text-[#ff3b30]">Expenses</p>
            <p className="text-[13px] font-black text-[#ff3b30] mono-num mt-0.5">{fmt(revExpTrend.reduce((s,r)=>s+r.Expenses,0))}</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="apple-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <SectionHeader title="Recent Transactions" subtitle="Latest activity" href="/accounting/ledger" hrefLabel="Ledger" />
        </div>
        <div className="divide-y divide-[var(--border)]">
          {recentTxns.length === 0
            ? <div className="p-8 text-center text-[13px] text-[var(--muted-foreground)]">No transactions yet</div>
            : recentTxns.slice(0, 7).map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${t.type === "income" ? "bg-[#34c759]/10" : "bg-[#ff3b30]/10"}`}>
                  {t.type === "income"
                    ? <ArrowUpRight size={13} className="text-[#34c759]" />
                    : <ArrowDownRight size={13} className="text-[#ff3b30]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[var(--foreground)] truncate">{t.description}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] mono-num">{t.transaction_date?.substring(0, 10)}</p>
                </div>
                <span className={`text-[12px] font-black mono-num ${t.type === "income" ? "text-[#34c759]" : "text-[#ff3b30]"}`}>
                  {t.type === "income" ? "+" : "−"}{fmt(Number(t.amount))}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Finance Calendar */}
      <div className="apple-card p-4 lg:p-5">
        <SectionHeader title="Finance Calendar" subtitle="Due dates & events" icon={Calendar} href="/accounting/fee-management" hrefLabel="Invoices" className="mb-4" />
        <MiniCalendar events={calendarEvents} />
        {calendarEvents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2">
            <p className="label-xs">Upcoming due dates</p>
            {calendarEvents.slice(0, 3).map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.color === "red" ? "bg-[#ff3b30]" : e.color === "amber" ? "bg-[#ff9f0a]" : "bg-[#007aff]"}`} />
                <p className="text-[11px] text-[var(--foreground)] truncate font-medium">{e.label}</p>
                <span className="text-[10px] text-[var(--muted-foreground)] shrink-0 mono-num ml-auto">{e.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
