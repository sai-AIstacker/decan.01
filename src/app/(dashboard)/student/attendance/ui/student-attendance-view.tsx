"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function StudentAttendanceView({
  attendanceData
}: {
  attendanceData: any[];
}) {

  // Aggregate stats
  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0, half = 0;
    attendanceData.forEach(r => {
      if (r.status === 'present') present++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'late') late++;
      else if (r.status === 'half_day') half++;
    });
    const total = attendanceData.length;
    // Late and half_day might count partially, we'll keep it simple: 
    // Usually percentage represents Full Present out of Total, or logic assigns weights.
    // We'll give 1.0 for present, 0.0 for absent, 0.5 for half, 1.0 for late (but flagged).
    const effectivePresent = present + late + (half * 0.5);
    const percentage = total === 0 ? 0 : Math.round((effectivePresent / total) * 100);

    return { total, present, absent, late, half, percentage };
  }, [attendanceData]);

  return (
    <div className="space-y-6">
      
      {/* Metric Cards */}
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="apple-card">
          <div className="text-sm font-medium text-zinc-500 mb-1">Total Classes</div>
          <div className="text-3xl font-extrabold">{stats.total}</div>
        </div>
        <div className="apple-card">
          <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">Present</div>
          <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-500">{stats.present}</div>
        </div>
        <div className="apple-card">
          <div className="text-sm font-medium text-rose-600 dark:text-rose-400 mb-1">Absent</div>
          <div className="text-3xl font-extrabold text-rose-700 dark:text-rose-500">{stats.absent}</div>
        </div>
        <div className="apple-card">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 dark:text-zinc-300 mb-1">Percentage</div>
          <div className="text-3xl font-extrabold text-indigo-700 dark:text-zinc-700 dark:text-zinc-300">{stats.percentage}%</div>
        </div>
      </div>

      <div className="bg-white dark:bg-black apple-card overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Class Context</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceData.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium text-zinc-700 dark:text-zinc-300">
                  {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{log.classes?.name} {log.classes?.section}</span>
                    <span className="text-xs text-zinc-500">{log.subjects?.name || "Homeroom"}</span>
                  </div>
                </TableCell>
                <TableCell>
                   <Badge variant={
                     log.status === 'present' ? 'default' :
                     log.status === 'absent' ? 'destructive' :
                     log.status === 'late' ? 'secondary' : 'outline'
                   } className={log.status === 'late' ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-transparent dark:text-amber-500' : ''}>
                     {log.status.replace("_", " ").toUpperCase()}
                   </Badge>
                </TableCell>
              </TableRow>
            ))}
            {attendanceData.length === 0 && (
               <TableRow><TableCell colSpan={3} className="text-center text-zinc-500">No attendance history logged yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
