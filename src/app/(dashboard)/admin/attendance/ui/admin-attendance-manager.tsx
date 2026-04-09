"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";

export default function AdminAttendanceManager({
  availableClasses
}: {
  availableClasses: any[];
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterClass, setFilterClass] = useState("all");
  
  const supabase = createClient();

  // Load Initial logs
  useEffect(() => {
    fetchLogs();
    
    // Subscribe to real-time attendance inserts/updates globally via Postgres CDC
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        (payload) => {
          // Fire refetch to guarantee joined entities accurately load 
          fetchLogs();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate, filterClass]);

  async function fetchLogs() {
    let query = supabase
      .from("attendance")
      .select(`
        *,
        profiles!attendance_student_id_fkey(full_name, email),
        classes(name, section),
        subjects(name)
      `)
      .order("created_at", { ascending: false });

    if (filterDate) {
      query = query.eq("date", filterDate);
    }
    
    if (filterClass !== "all") {
       query = query.eq("class_id", filterClass);
    }

    const { data } = await query;
    if (data) setLogs(data);
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert("No data available to export.");
      return;
    }

    // Construct simple CSV string
    const headers = ["Student", "Class", "Subject", "Date", "Status", "Marked Time"];
    const rows = logs.map(l => [
      l.profiles?.full_name || l.profiles?.email || 'Unknown',
      `${l.classes?.name} ${l.classes?.section}`,
      l.subjects?.name || 'Homeroom',
      l.date,
      l.status,
      new Date(l.created_at).toLocaleString()
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `attendance_export_${filterDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white/50 dark:bg-zinc-900/50 apple-card backdrop-blur-xl shadow-sm gap-4">
        <div className="flex gap-4">
          <div>
            <Label htmlFor="date">Filter Date</Label>
            <Input 
              id="date" 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="class">Filter Class</Label>
            <select 
              id="class" 
              value={filterClass} 
              onChange={(e) => setFilterClass(e.target.value)} 
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1 min-w-[200px]"
            >
               <option value="all" className="dark:bg-zinc-900">All Classes</option>
               {availableClasses.map(c => (
                 <option key={c.id} value={c.id} className="dark:bg-zinc-900">{c.name} {c.section}</option>
               ))}
            </select>
          </div>
        </div>
        
        <Button onClick={handleExportCSV} variant="outline" className="rounded-xl border-zinc-200 text-indigo-700 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-indigo-100/50 dark:border-zinc-700/20 dark:text-zinc-300 dark:bg-zinc-900 dark:bg-zinc-100/10 dark:hover:bg-zinc-900 dark:bg-zinc-100/20 shadow-sm mt-5 sm:mt-0">
           <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="bg-white dark:bg-black apple-card overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Class Context</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium text-foreground">{log.profiles?.full_name || log.profiles?.email}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{log.classes?.name} {log.classes?.section}</span>
                    <span className="text-xs text-zinc-500">{log.subjects?.name || "Homeroom"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-zinc-500">{log.date}</TableCell>
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
            {logs.length === 0 && (
               <TableRow><TableCell colSpan={4} className="text-center text-zinc-500">No attendance records found matching filters.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
