"use client";

export function AttendanceDatePicker({ selectedDate, today }: { selectedDate: string; today: string }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-[13px] font-semibold text-[var(--muted-foreground)]">Date:</label>
      <input
        name="date"
        type="date"
        defaultValue={selectedDate}
        max={today}
        onChange={e => {
          const params = new URLSearchParams(window.location.search);
          params.set("date", e.target.value);
          window.location.search = params.toString();
        }}
        className="h-9 rounded-[10px] border border-[var(--border)] bg-[var(--surface-1)] px-3 text-[13px] text-[var(--foreground)] outline-none focus:border-[#1d1d1f] transition-colors"
      />
    </div>
  );
}
