"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ParentAttendanceView({
  attendanceData,
  childrenData
}: {
  attendanceData: any[];
  childrenData: any[];
}) {
  const [selectedChildId, setSelectedChildId] = useState(childrenData[0]?.student_id || "all");

  const filteredLogs = useMemo(() => {
    if (selectedChildId === "all") return attendanceData;
    return attendanceData.filter(a => a.student_id === selectedChildId);
  }, [attendanceData, selectedChildId]);

  // Aggregate stats over filtered
  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0, half = 0;
    filteredLogs.forEach(r => {
      if (r.status === 'present') present++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'late') late++;
      else if (r.status === 'half_day') half++;
    });
    const total = filteredLogs.length;
    const effectivePresent = present + late + (half * 0.5);
    const percentage = total === 0 ? 0 : Math.round((effectivePresent / total) * 100);

    return { total, present, absent, late, half, percentage };
  }, [filteredLogs]);

  return (
    <div className="space-y-6">
      
      <div className="p-4 bg-white/50 dark:bg-zinc-900/50 apple-card backdrop-blur-xl shadow-sm inline-block">
         <Label htmlFor="childFilter" className="mr-3">Display Data For:</Label>
         <select 
            id="childFilter" 
            value={selectedChildId} 
            onChange={(e) => setSelectedChildId(e.target.value)} 
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1 min-w-[200px]"
          >
            {childrenData.length > 1 && <option value="all" className="dark:bg-zinc-900">All Children</option>}
            {childrenData.map(c => (
              <option key={c.student_id} value={c.student_id} className="dark:bg-zinc-900">
                {c.profiles?.full_name || c.profiles?.email}
              </option>
            ))}
         </select>
         {childrenData.length === 0 && <span className="text-sm text-rose-500 ml-2">No children linked to account.</span>}
      </div>

      {/* Metric Cards */}
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="apple-card">
          <div className="text-sm font-medium text-zinc-500 mb-1">Attendance Records</div>
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
              <TableHead>Child</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Class Context</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-semibold text-foreground">
                   {log.profiles?.full_name || log.profiles?.email}
                </TableCell>
                <TableCell className="font-medium text-zinc-700 dark:text-zinc-300">
                  {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
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
            {filteredLogs.length === 0 && (
               <TableRow><TableCell colSpan={4} className="text-center text-zinc-500">No attendance history logged yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
