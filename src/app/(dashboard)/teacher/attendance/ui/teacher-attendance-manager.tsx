"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, Clock, HelpCircle, Save, Loader2, WifiOff } from "lucide-react";
import { triggerAutomationEvent } from "@/lib/actions/notifications";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

type AttendanceStatus = "present" | "absent" | "late" | "half_day";

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: React.ElementType; activeClass: string }> = {
  present:  { label: "Present",  icon: Check,       activeClass: "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" },
  absent:   { label: "Absent",   icon: X,           activeClass: "bg-rose-500 text-white shadow-md shadow-rose-500/20" },
  late:     { label: "Late",     icon: Clock,       activeClass: "bg-amber-500 text-white shadow-md shadow-amber-500/20" },
  half_day: { label: "Half Day", icon: HelpCircle,  activeClass: "bg-[#1d1d1f] text-white shadow-md shadow-blue-500/20" },
};

export default function TeacherAttendanceManager({
  teacherScopes,
  settings,
  teacherId,
}: {
  teacherScopes: any[];
  settings: any;
  teacherId: string;
}) {
  const [selectedHash, setSelectedHash] = useState(
    teacherScopes.length > 0 ? teacherScopes[0].hash : ""
  );
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Prevent double-save with a ref guard in addition to state
  const saveInFlight = useRef(false);

  const supabase = createClient();

  useEffect(() => {
    fetchTargetRoster();
  }, [selectedHash, selectedDate]);

  const fetchTargetRoster = async () => {
    if (!selectedHash) return;
    setIsLoading(true);
    setNetworkError(null);

    try {
      const [classId, subjectIdStr] = selectedHash.split("::", 2);
      const subjectId = subjectIdStr === "null" ? null : subjectIdStr;

      const [enrollsRes, attRes] = await Promise.all([
        supabase
          .from("enrollments")
          .select("student_id, profiles(full_name, email)")
          .eq("class_id", classId)
          .eq("status", "active"),
        supabase
          .from("attendance")
          .select("*")
          .eq("class_id", classId)
          .eq("date", selectedDate)
          .or(subjectId ? `subject_id.eq.${subjectId}` : `subject_id.is.null`),
      ]);

      if (enrollsRes.error) throw enrollsRes.error;

      const stubs = enrollsRes.data || [];
      setStudents(stubs);

      const existingMap: Record<string, AttendanceStatus> = {};
      if (attRes.data && attRes.data.length > 0) {
        attRes.data.forEach((a) => (existingMap[a.student_id] = a.status as AttendanceStatus));
      } else {
        // Auto-fill based on time
        let autoStatus: AttendanceStatus = "present";
        if (selectedDate === todayStr && settings) {
          const [hr, min] = settings.school_start_time.split(":");
          const startLimit = new Date();
          startLimit.setHours(parseInt(hr), parseInt(min), 0, 0);
          const diffMinutes = (Date.now() - startLimit.getTime()) / 60000;
          if (diffMinutes > settings.half_day_after_minutes) autoStatus = "half_day";
          else if (diffMinutes > settings.late_after_minutes) autoStatus = "late";
        }
        stubs.forEach((s) => (existingMap[s.student_id] = autoStatus));
      }
      setAttendanceData(existingMap);
    } catch (e: any) {
      setNetworkError("Failed to load roster. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleBulkSave = async () => {
    if (!selectedHash || isSaving || saveInFlight.current) return;
    if (students.length === 0) {
      toast.warning("No students to save attendance for.");
      return;
    }

    // Validate: ensure every student has a status
    const missing = students.filter((s) => !attendanceData[s.student_id]);
    if (missing.length > 0) {
      toast.warning(`${missing.length} student(s) have no status set. Please mark all students.`);
      return;
    }

    saveInFlight.current = true;
    setIsSaving(true);

    const [classId, subjectIdStr] = selectedHash.split("::", 2);
    const subjectId = subjectIdStr === "null" ? null : subjectIdStr;

    const rowsToUpsert = students.map((s) => ({
      student_id: s.student_id,
      class_id: classId,
      subject_id: subjectId,
      date: selectedDate,
      status: attendanceData[s.student_id],
      marked_by: teacherId,
    }));

    try {
      const { error } = await supabase.from("attendance").upsert(rowsToUpsert, {
        onConflict: "student_id, class_id, subject_id, date",
      });
      if (error) throw error;

      // Trigger automation events for absent students (non-blocking)
      rowsToUpsert
        .filter((row) => row.status === "absent")
        .forEach((row) => {
          triggerAutomationEvent("attendance_absent", row.student_id, "/student/attendance");
        });

      toast.success(`Attendance saved for ${students.length} student${students.length !== 1 ? "s" : ""}.`);
    } catch (e: any) {
      const message = e.message || "Unknown error";
      if (message.includes("network") || message.includes("fetch")) {
        toast.error("Network error — attendance not saved. Please check your connection.");
      } else {
        toast.error("Save failed: " + message);
      }
    } finally {
      setIsSaving(false);
      saveInFlight.current = false;
    }
  };

  if (teacherScopes.length === 0) {
    return (
      <EmptyState
        title="No classes assigned"
        description="You have not been assigned to any classes or subjects yet. Contact your administrator."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid sm:grid-cols-3 gap-4 p-4 bg-white/50 dark:bg-zinc-900/50 apple-card backdrop-blur-xl shadow-sm">
        <div>
          <Label htmlFor="scope">Select Tracking Scope</Label>
          <select
            id="scope"
            value={selectedHash}
            onChange={(e) => setSelectedHash(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1 disabled:opacity-50"
          >
            {teacherScopes.map((scope) => (
              <option key={scope.hash} value={scope.hash} className="dark:bg-zinc-900">
                {scope.className} ({scope.subjectName})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            max={todayStr}
            value={selectedDate}
            onChange={(e) => {
              // Prevent future dates
              if (e.target.value > todayStr) {
                toast.warning("Attendance cannot be marked for future dates.");
                return;
              }
              setSelectedDate(e.target.value);
            }}
            disabled={isLoading}
            className="mt-1"
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={handleBulkSave}
            disabled={isSaving || isLoading || students.length === 0}
            className="w-full bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5 h-10"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? "Saving..." : "Save Roster"}
          </Button>
        </div>
      </div>

      {/* Network Error Banner */}
      {networkError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>{networkError}</span>
          <button
            onClick={fetchTargetRoster}
            className="ml-auto underline hover:no-underline text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Student Roster */}
      <div className="apple-card overflow-hidden p-5">
        <h3 className="font-semibold text-lg mb-4">Mark Attendance</h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-zinc-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading roster…</span>
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            title="No students enrolled"
            description="No active enrollments found for this class and subject combination."
          />
        ) : (
          <div className="space-y-2">
            {students.map((student) => {
              const currentStatus = attendanceData[student.student_id] as AttendanceStatus | undefined;
              return (
                <div
                  key={student.student_id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/30 gap-3 transition-colors"
                >
                  <div className="font-medium text-sm">
                    {student.profiles?.full_name || student.profiles?.email || "Unknown Student"}
                    {!currentStatus && (
                      <span className="ml-2 text-xs text-rose-500 font-normal">⚠ Not marked</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(STATUS_CONFIG) as [AttendanceStatus, typeof STATUS_CONFIG[AttendanceStatus]][]).map(
                      ([status, config]) => {
                        const Icon = config.icon;
                        const isActive = currentStatus === status;
                        return (
                          <button
                            key={status}
                            onClick={() => handleToggle(student.student_id, status)}
                            disabled={isSaving}
                            className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                              isActive
                                ? config.activeClass
                                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 mr-1.5" />
                            {config.label}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
