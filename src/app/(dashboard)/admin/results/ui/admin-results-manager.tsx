"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Users, Trophy, TrendingUp, BarChart3, AlertCircle } from "lucide-react";

/* ─── Ordinal helper ─── */
function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ─── Subject Analytics Mini Chart SVG ─── */
function SubjectAnalyticsChart({ data }: { data: { name: string; avgPct: number; label: string }[] }) {
  if (data.length === 0) return null;
  const barH = 24;
  const gap = 12;
  const labelW = 100;
  const chartW = 300;
  const totalH = data.length * (barH + gap);

  return (
    <svg viewBox={`0 0 ${labelW + chartW + 60} ${totalH + 10}`} className="w-full max-w-xl" role="img" aria-label="Subject analytics chart">
      {data.map((d, i) => {
        const y = i * (barH + gap) + 5;
        const width = (d.avgPct / 100) * chartW;
        const fill = d.avgPct >= 75 ? "#10b981" : d.avgPct >= 50 ? "#f59e0b" : "#f43f5e";

        return (
          <g key={i}>
            <text x={labelW - 8} y={y + barH / 2 + 5} textAnchor="end" className="fill-current text-zinc-600 dark:text-zinc-400" fontSize="12" fontWeight="500">
              {d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name}
            </text>
            <rect x={labelW} y={y} width={chartW} height={barH} rx="4" className="fill-zinc-100 dark:fill-zinc-800" />
            <rect x={labelW} y={y} width={Math.max(width, 4)} height={barH} rx="4" fill={fill} opacity="0.85">
               <animate attributeName="width" from="0" to={Math.max(width, 4)} dur="0.8s" fill="freeze" />
            </rect>
            <text x={labelW + Math.max(width, 4) + 8} y={y + barH / 2 + 5} fontSize="12" fontWeight="600" className="fill-current text-zinc-700 dark:text-zinc-300">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminResultsManager({
  exams,
  subjects,
  examSubjects,
  gradingSystem
}: {
  exams: any[];
  subjects: any[];
  examSubjects: any[];
  gradingSystem: any[];
}) {
  const [selectedExamId, setSelectedExamId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Data state
  const [loading, setLoading] = useState(false);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [marksData, setMarksData] = useState<any[]>([]);
  const [rankData, setRankData] = useState<Record<string, number>>({});

  const supabase = createClient();

  useEffect(() => {
    if (selectedExamId) {
      loadExamResults();
    } else {
      setEnrollments([]);
      setMarksData([]);
      setRankData({});
    }
  }, [selectedExamId]);

  const loadExamResults = async () => {
    const ex = exams.find(e => e.id === selectedExamId);
    if (!ex) return;

    setLoading(true);
    
    // 1. Fetch Enrollments
    const { data: enrolls } = await supabase
      .from("enrollments")
      .select("student_id, profiles(full_name, email)")
      .eq("class_id", ex.class_id)
      .eq("status", "active");
      
    // 2. Fetch marks for this exam
    const { data: marks } = await supabase
      .from("marks")
      .select("student_id, subject_id, marks_obtained, grade")
      .eq("exam_id", selectedExamId);
      
    // 3. We can't batch call the RPC easily, so we compute ranks locally here or do individual RPCs.
    // For admin view, computing locally is better to avoid N+1 queries.
    const studentTotals: Record<string, number> = {};
    if (marks) {
      marks.forEach(m => {
        studentTotals[m.student_id] = (studentTotals[m.student_id] || 0) + m.marks_obtained;
      });
    }
    
    const sortedStudents = Object.keys(studentTotals).sort((a, b) => studentTotals[b] - studentTotals[a]);
    const computedRanks: Record<string, number> = {};
    let currentRank = 1;
    let prevTotal = -1;
    let rankOffset = 0;
    
    sortedStudents.forEach(sid => {
       if (studentTotals[sid] === prevTotal) {
          computedRanks[sid] = currentRank;
          rankOffset++;
       } else {
          currentRank = currentRank + rankOffset;
          computedRanks[sid] = currentRank;
          rankOffset = 1;
       }
       prevTotal = studentTotals[sid];
    });

    setEnrollments(enrolls || []);
    setMarksData(marks || []);
    setRankData(computedRanks);
    setLoading(false);
  };

  // Compute analytics
  const analytics = useMemo(() => {
    if (!selectedExamId || enrollments.length === 0) return null;
    
    const activeExamSubjects = examSubjects.filter(es => es.exam_id === selectedExamId);
    const overallMaxAllowed = activeExamSubjects.reduce((sum, es) => sum + es.max_marks, 0);
    
    const processedStudents = enrollments.map(en => {
      const sMarks = marksData.filter(m => m.student_id === en.student_id);
      let totalObtained = 0;
      let failedCount = 0;
      
      const mappedMarks = activeExamSubjects.map(es => {
        const mark = sMarks.find(m => m.subject_id === es.subject_id);
        const obtained = mark ? mark.marks_obtained : 0;
        const max = es.max_marks;
        const passTarget = es.pass_marks;
        const isFailed = !mark || obtained < passTarget;
        
        totalObtained += obtained;
        if (isFailed) failedCount++;
        
        return {
          subject_id: es.subject_id,
          obtained,
          max,
          isFailed
        };
      });
      
      const pct = overallMaxAllowed > 0 ? (totalObtained / overallMaxAllowed) * 100 : 0;
      let overallGrade = 'F';
      for (const sys of gradingSystem) {
        if (pct >= sys.min_percentage && pct <= sys.max_percentage) {
          overallGrade = sys.grade;
          break;
        }
      }
      
      return {
        id: en.student_id,
        name: en.profiles?.full_name || en.profiles?.email,
        mappedMarks,
        totalObtained,
        pct: pct.toFixed(2),
        overallGrade,
        isFailed: failedCount > 0,
        rank: rankData[en.student_id] || enrollments.length // unranked at bottom
      };
    });
    
    // Sort students by rank
    processedStudents.sort((a, b) => a.rank - b.rank);
    
    // Overall stats
    const totalStudents = processedStudents.length;
    const passCount = processedStudents.filter(s => !s.isFailed).length;
    const failCount = totalStudents - passCount;
    const classAvgPct = (processedStudents.reduce((sum, s) => sum + parseFloat(s.pct), 0) / (totalStudents || 1)).toFixed(1);
    
    // Subject stats
    const subjectStats = activeExamSubjects.map(es => {
      const subName = subjects.find(s => s.id === es.subject_id)?.name || "Unknown";
      let totalObjtainedInSub = 0;
      processedStudents.forEach(s => {
         const sm = s.mappedMarks.find(m => m.subject_id === es.subject_id);
         if (sm) totalObjtainedInSub += sm.obtained;
      });
      const avg = totalStudents > 0 ? totalObjtainedInSub / totalStudents : 0;
      const avgPct = es.max_marks > 0 ? (avg / es.max_marks) * 100 : 0;
      
      return {
        name: subName,
        avgPct,
        label: `${avg.toFixed(1)} / ${es.max_marks}`
      };
    });

    return {
      processedStudents,
      totalStudents,
      passCount,
      failCount,
      classAvgPct,
      subjectStats,
      activeExamSubjects
    };
  }, [selectedExamId, enrollments, marksData, rankData, examSubjects, subjects, gradingSystem]);

  const filteredStudents = useMemo(() => {
    if (!analytics) return [];
    if (!searchTerm) return analytics.processedStudents;
    return analytics.processedStudents.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [analytics, searchTerm]);

  const handleDownloadCSV = () => {
    if (!analytics || !selectedExamId) return;
    
    const ex = exams.find(e => e.id === selectedExamId);
    
    // Headers
    const headers = ["Rank", "Student Name", "Status", "Overall Grade", "Percentage", "Total Marks"];
    analytics.activeExamSubjects.forEach(es => {
       const subName = subjects.find(s => s.id === es.subject_id)?.name || "Sub";
       headers.push(`${subName} (${es.max_marks})`);
    });
    
    const rows = [headers];
    
    filteredStudents.forEach(s => {
       const row = [
         String(s.rank),
         s.name,
         s.isFailed ? "FAIL" : "PASS",
         s.overallGrade,
         `${s.pct}%`,
         String(s.totalObtained)
       ];
       
       analytics.activeExamSubjects.forEach(es => {
          const sm = s.mappedMarks.find(m => m.subject_id === es.subject_id);
          row.push(sm ? String(sm.obtained) : "0");
       });
       
       rows.push(row);
    });
    
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consolidated_results_${ex?.name?.replace(/\s+/g, '_') || 'exam'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white/60 dark:bg-zinc-900/60 apple-card backdrop-blur-xl shadow-sm gap-4">
        <div className="w-full sm:w-auto">
           <Label className="mb-1 block">Analyze Examination</Label>
           <select 
             value={selectedExamId} 
             onChange={(e) => setSelectedExamId(e.target.value)} 
             className="w-full sm:min-w-[400px] rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2"
           >
              <option value="" className="dark:bg-zinc-900">Select Exam...</option>
              {exams.map(ex => (
                 <option key={ex.id} value={ex.id} className="dark:bg-zinc-900">{ex.classes?.name} {ex.classes?.section} — {ex.name}</option>
              ))}
           </select>
        </div>
        <Button onClick={handleDownloadCSV} disabled={!analytics || filteredStudents.length === 0} variant="outline" className="rounded-xl shrink-0 w-full sm:w-auto border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/50 dark:border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10 shadow-sm transition-all hover:-translate-y-0.5">
           <Download className="w-4 h-4 mr-2" /> Export to CSV
        </Button>
      </div>

      {loading && (
        <div className="p-12 text-center text-zinc-500">
          Compiling results analytics...
        </div>
      )}

      {!loading && analytics && (
        <>
          {/* Top Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 apple-card bg-white dark:bg-zinc-950 shadow-sm flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 dark:bg-zinc-100/10 flex items-center justify-center text-zinc-900 dark:text-zinc-100 dark:text-zinc-300">
                 <Users className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-sm font-medium text-zinc-500">Total Students</p>
                  <p className="text-2xl font-bold">{analytics.totalStudents}</p>
               </div>
            </div>
            <div className="p-5 apple-card bg-white dark:bg-zinc-950 shadow-sm flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                 <Trophy className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-sm font-medium text-zinc-500">Pass Rate</p>
                  <p className="text-2xl font-bold">{analytics.totalStudents > 0 ? ((analytics.passCount / analytics.totalStudents) * 100).toFixed(0) : 0}%</p>
               </div>
            </div>
            <div className="p-5 apple-card bg-white dark:bg-zinc-950 shadow-sm flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                 <TrendingUp className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-sm font-medium text-zinc-500">Class Average</p>
                  <p className="text-2xl font-bold">{analytics.classAvgPct}%</p>
               </div>
            </div>
            <div className="p-5 apple-card bg-white dark:bg-zinc-950 shadow-sm flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                 <AlertCircle className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-sm font-medium text-zinc-500">Failed / Resit</p>
                  <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{analytics.failCount}</p>
               </div>
            </div>
          </div>

          {/* Subject Analytics Insights */}
          {analytics.subjectStats.length > 0 && (
             <div className="p-6 apple-card bg-white dark:bg-zinc-950 shadow-sm">
                <div className="flex items-center gap-2 mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                   <BarChart3 className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                   <h2 className="font-semibold text-lg">Subject Performance Averages</h2>
                </div>
                <SubjectAnalyticsChart data={analytics.subjectStats} />
             </div>
          )}

          {/* Consolidated Results Table */}
          <div className="apple-card bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex justify-between items-center flex-wrap gap-4">
                <h3 className="font-semibold">Consolidated Score Sheet</h3>
                <div className="relative">
                   <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                   <Input 
                      placeholder="Search student..." 
                      className="pl-9 w-full sm:w-64 bg-white dark:bg-zinc-900 rounded-xl"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
             </div>
             
             <div className="overflow-x-auto">
                <Table>
                   <TableHeader>
                      <TableRow className="bg-zinc-50/80 dark:bg-zinc-800/20 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/20">
                         <TableHead className="w-16 text-center">Rank</TableHead>
                         <TableHead className="min-w-[150px]">Student Name</TableHead>
                         <TableHead className="text-center font-bold text-zinc-900 dark:text-zinc-100 dark:text-zinc-300 w-24">Total</TableHead>
                         <TableHead className="text-center w-24">Grade</TableHead>
                         <TableHead className="text-center w-24">Status</TableHead>
                         {/* Dynamic Subjects Headers */}
                         {analytics.activeExamSubjects.map(es => {
                           const subName = subjects.find(s => s.id === es.subject_id)?.name || "Sub";
                           return (
                             <TableHead key={es.subject_id} className="text-center min-w-[100px] border-l border-zinc-100 dark:border-zinc-800/50">
                                <div className="text-xs break-words">{subName}</div>
                                <div className="text-[10px] text-zinc-400 font-normal">Max: {es.max_marks}</div>
                             </TableHead>
                           );
                         })}
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                     {filteredStudents.map(student => (
                        <TableRow key={student.id} className={student.isFailed ? 'bg-rose-50/30 dark:bg-rose-500/5' : ''}>
                           <TableCell className="text-center">
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto text-sm font-bold ${student.rank <= 3 && !student.isFailed ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                               {student.rank}
                             </div>
                           </TableCell>
                           <TableCell className="font-medium">{student.name}</TableCell>
                           <TableCell className="text-center font-bold text-zinc-900 dark:text-zinc-100 dark:text-zinc-300">
                              {student.totalObtained}
                              <div className="text-[10px] text-indigo-400 dark:text-zinc-700 dark:text-zinc-300 font-normal">{student.pct}%</div>
                           </TableCell>
                           <TableCell className="text-center font-bold">{student.overallGrade}</TableCell>
                           <TableCell className="text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              student.isFailed 
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                            }`}>
                              {student.isFailed ? 'Fail' : 'Pass'}
                            </span>
                           </TableCell>
                           {/* Dynamic Subjects Cells */}
                           {analytics.activeExamSubjects.map(es => {
                             const sm = student.mappedMarks.find(m => m.subject_id === es.subject_id);
                             return (
                               <TableCell key={es.subject_id} className={`text-center border-l border-zinc-100 dark:border-zinc-800/50 ${sm?.isFailed ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}`}>
                                 {sm ? sm.obtained : <span className="text-zinc-300 dark:text-zinc-700">-</span>}
                               </TableCell>
                             );
                           })}
                        </TableRow>
                     ))}
                     {filteredStudents.length === 0 && (
                        <TableRow>
                           <TableCell colSpan={5 + analytics.activeExamSubjects.length} className="h-32 text-center text-zinc-500">
                             No students match your search criteria.
                           </TableCell>
                        </TableRow>
                     )}
                   </TableBody>
                </Table>
             </div>
          </div>
        </>
      )}

      {!loading && !analytics && selectedExamId !== "" && (
         <div className="apple-card p-12 text-center">
            <Users className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">No active enrollments for this class</p>
         </div>
      )}
    </div>
  );
}
