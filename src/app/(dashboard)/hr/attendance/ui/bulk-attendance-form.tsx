"use client";

import { useState, useTransition } from "react";
import { UserCheck, X, Loader2, Save } from "lucide-react";
import { bulkMarkAttendance } from "../../actions";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/user-avatar";

interface Staff { id: string; full_name: string; email: string; }

const STATUS_OPTIONS = [
  { value: "present", label: "Present", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  { value: "absent", label: "Absent", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
  { value: "late", label: "Late", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  { value: "half_day", label: "Half Day", color: "bg-blue-100 text-zinc-900 dark:bg-zinc-800 dark:text-blue-300" },
  { value: "on_leave", label: "On Leave", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
];

export function BulkAttendanceForm({
  staff,
  date,
  existingAttendance,
}: {
  staff: Staff[];
  date: string;
  existingAttendance: Record<string, any>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [statuses, setStatuses] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    staff.forEach((s) => { init[s.id] = existingAttendance[s.id]?.status || "present"; });
    return init;
  });

  function handleSave() {
    const entries = Object.entries(statuses).map(([staffId, status]) => ({ staffId, status }));
    startTransition(async () => {
      const result = await bulkMarkAttendance(date, entries);
      if (result.success) { toast.success("Attendance saved"); setOpen(false); }
      else toast.error(result.error || "Failed to save attendance");
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1d1d1f] text-white text-sm font-medium hover:bg-[#3a3a3c] transition-colors shadow-sm">
        <UserCheck className="w-4 h-4" /> Mark Attendance
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl apple-card my-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-700/50">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Mark Attendance</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{date}</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <div className="p-6 space-y-2 max-h-[60vh] overflow-y-auto">
              {staff.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No staff members found</p>
              ) : (
                staff.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <UserAvatar userId={s.id} name={s.full_name} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{s.full_name}</p>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStatuses((prev) => ({ ...prev, [s.id]: opt.value }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${statuses[s.id] === opt.value ? opt.color + " border-current" : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-slate-200/50 dark:border-slate-700/50 flex gap-3">
              <button onClick={() => setOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={isPending || staff.length === 0} className="flex-1 px-4 py-2.5 rounded-xl bg-[#1d1d1f] text-white text-sm font-medium hover:bg-[#3a3a3c] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isPending ? "Saving..." : "Save Attendance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
