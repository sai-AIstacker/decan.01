"use client";

import { PremiumLineChart } from "@/components/ui/premium-line-chart";
import { MiniCalendar } from "@/components/ui/mini-calendar";
import { SectionHeader } from "@/components/ui/section-header";
import { TrendingUp, Calendar, Users } from "lucide-react";

interface Props {
  attendanceTrend: { name: string; Attendance: number }[];
  enrollTrend:     { name: string; Enrollments: number }[];
  calendarEvents:  { date: string; label: string; color: "blue"|"green"|"red"|"amber"|"purple" }[];
  feeStats:        { paid: number; pending: number };
}

export function AdminChartsClient({ attendanceTrend, enrollTrend, calendarEvents, feeStats }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">

      {/* Attendance trend — line chart */}
      <div className="apple-card p-4 lg:p-5">
        <SectionHeader title="Attendance Trend" subtitle="6-month overview" icon={TrendingUp} href="/admin/attendance" hrefLabel="View logs" className="mb-4" />
        {attendanceTrend.length > 0 ? (
          <PremiumLineChart
            data={attendanceTrend}
            lines={[{ key: "Attendance", color: "#1d1d1f", label: "Attendance %" }]}
            xKey="name"
            height={180}
            filled
          />
        ) : (
          <div className="h-[180px] flex items-center justify-center text-[13px] text-[var(--muted-foreground)]">No data yet</div>
        )}
        {/* Fee mini stats */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--border)]">
          <div className="flex-1 rounded-[12px] bg-[#34c759]/8 border border-[#34c759]/15 p-2.5 text-center">
            <p className="label-xs text-[#34c759]">Paid</p>
            <p className="text-[16px] font-black text-[#34c759] mono-num mt-0.5">{feeStats.paid}</p>
          </div>
          <div className="flex-1 rounded-[12px] bg-[#ff9f0a]/8 border border-[#ff9f0a]/15 p-2.5 text-center">
            <p className="label-xs text-[#ff9f0a]">Pending</p>
            <p className="text-[16px] font-black text-[#ff9f0a] mono-num mt-0.5">{feeStats.pending}</p>
          </div>
        </div>
      </div>

      {/* Enrollment trend */}
      <div className="apple-card p-4 lg:p-5">
        <SectionHeader title="Enrollment Trend" subtitle="New enrollments" icon={Users} href="/admin/enrollments" hrefLabel="Manage" className="mb-4" />
        {enrollTrend.length > 0 ? (
          <PremiumLineChart
            data={enrollTrend}
            lines={[{ key: "Enrollments", color: "#007aff", label: "Enrollments" }]}
            xKey="name"
            height={180}
            filled
          />
        ) : (
          <div className="h-[180px] flex items-center justify-center text-[13px] text-[var(--muted-foreground)]">No data yet</div>
        )}
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <p className="text-[11px] text-[var(--muted-foreground)]">Total this period</p>
          <p className="text-[22px] font-black text-[var(--foreground)] mono-num">
            {enrollTrend.reduce((s, r) => s + r.Enrollments, 0)}
          </p>
        </div>
      </div>

      {/* Premium Calendar */}
      <div className="apple-card p-4 lg:p-5">
        <SectionHeader title="School Calendar" subtitle="Upcoming exams" icon={Calendar} href="/admin/exams" hrefLabel="All exams" className="mb-4" />
        <MiniCalendar events={calendarEvents} />
        {calendarEvents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2">
            <p className="label-xs">Upcoming</p>
            {calendarEvents.slice(0, 3).map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#007aff] shrink-0" />
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
