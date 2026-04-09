"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Download, Trophy, AlertCircle, TrendingUp, BarChart3 } from "lucide-react";

/* ─── Ordinal helper ─── */
function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ─── Mini bar chart (SVG) ─── */
function SubjectBarChart({ subjects }: { subjects: { name: string; obtained: number; max: number; isFailed: boolean }[] }) {
  if (subjects.length === 0) return null;
  const barH = 28;
  const gap = 8;
  const labelW = 100;
  const chartW = 400;
  const totalH = subjects.length * (barH + gap);

  return (
    <svg viewBox={`0 0 ${labelW + chartW + 60} ${totalH + 10}`} className="w-full max-w-2xl" role="img" aria-label="Subject-wise marks chart">
      {subjects.map((s, i) => {
        const y = i * (barH + gap) + 5;
        const pct = s.max > 0 ? (s.obtained / s.max) * 100 : 0;
        const barW = (pct / 100) * chartW;
        const fill = s.isFailed ? "#f43f5e" : pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#6366f1";

        return (
          <g key={i}>
            <text x={labelW - 8} y={y + barH / 2 + 5} textAnchor="end" className="fill-current text-zinc-600 dark:text-zinc-400" fontSize="12" fontWeight="500">
              {s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name}
            </text>
            <rect x={labelW} y={y} width={chartW} height={barH} rx="6" className="fill-zinc-100 dark:fill-zinc-800" />
            <rect x={labelW} y={y} width={Math.max(barW, 4)} height={barH} rx="6" fill={fill} opacity="0.85">
              <animate attributeName="width" from="0" to={Math.max(barW, 4)} dur="0.8s" fill="freeze" />
            </rect>
            <text x={labelW + Math.max(barW, 4) + 8} y={y + barH / 2 + 5} fontSize="12" fontWeight="600" className="fill-current text-zinc-700 dark:text-zinc-300">
              {s.obtained}/{s.max}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Grade distribution donut ─── */
function GradeDistribution({ subjectsMatrix, gradingSystem }: { subjectsMatrix: any[]; gradingSystem: any[] }) {
  if (subjectsMatrix.length === 0 || gradingSystem.length === 0) return null;

  const gradeCount: Record<string, number> = {};
  subjectsMatrix.forEach(m => {
    const g = m.grade || 'F';
    gradeCount[g] = (gradeCount[g] || 0) + 1;
  });

  const total = subjectsMatrix.length;
  const gradeColors: Record<string, string> = {
    'A+': '#10b981', 'A': '#34d399', 'B': '#f59e0b', 'C': '#fb923c',
    'D': '#a78bfa', 'E': '#94a3b8', 'F': '#f43f5e'
  };

  const entries = Object.entries(gradeCount).sort((a, b) => {
    const order = ['A+', 'A', 'B', 'C', 'D', 'E', 'F'];
    return order.indexOf(a[0]) - order.indexOf(b[0]);
  });

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {entries.map(([grade, count]) => (
        <div key={grade} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: gradeColors[grade] || '#94a3b8' }} />
          <span className="text-sm font-bold">{grade}</span>
          <span className="text-xs text-zinc-500">×{count}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ─── */
export default function ReportCardView({
  studentId,
  studentName,
  exams,
  marksData,
  examSubjects,
  gradingSystem = []
}: {
  studentId: string;
  studentName: string;
  exams: any[];
  marksData: any[];
  examSubjects: any[];
  gradingSystem?: any[];
}) {
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || "");
  const [rankData, setRankData] = useState<{ total: number, rank: number } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (selectedExamId && studentId) {
       loadRank();
    }
  }, [selectedExamId, studentId]);

  const loadRank = async () => {
    try {
      const { data, error } = await supabase.rpc("get_student_rank", {
         _exam_id: selectedExamId,
         _student_id: studentId
      });
      if (data && data.length > 0) {
         setRankData({ total: data[0].total_marks, rank: data[0].rank });
      } else {
         setRankData(null);
      }
    } catch(e) {
      console.error(e);
      setRankData(null);
    }
  };

  const currentMarks = useMemo(() => {
    return marksData.filter(m => m.exam_id === selectedExamId);
  }, [selectedExamId, marksData]);

  const stats = useMemo(() => {
     let overallTotalObtained = 0;
     let overallMaxAllowed = 0;
     let failedCount = 0;

     const subjectsMatrix = currentMarks.map(m => {
        const bounds = examSubjects.find(es => es.exam_id === selectedExamId && es.subject_id === m.subjects?.id);
        const max = bounds?.max_marks || 100;
        const passTarget = bounds?.pass_marks || 35;
        const isFailed = m.marks_obtained < passTarget;
        
        overallTotalObtained += m.marks_obtained;
        overallMaxAllowed += max;
        if (isFailed) failedCount++;

        return { ...m, max, passTarget, isFailed };
     });

     const globalPercentage = overallMaxAllowed > 0 ? (overallTotalObtained / overallMaxAllowed) * 100 : 0;
     const outcome = failedCount > 0 ? 'FAIL' : 'PASS';

     // Determine overall grade
     let overallGrade = '—';
     for (const sys of gradingSystem) {
       if (globalPercentage >= sys.min_percentage && globalPercentage <= sys.max_percentage) {
         overallGrade = sys.grade;
         break;
       }
     }

     return {
       subjectsMatrix,
       overallTotalObtained,
       overallMaxAllowed,
       globalPercentage: globalPercentage.toFixed(2),
       outcome,
       failedCount,
       overallGrade
     };
  }, [currentMarks, examSubjects, selectedExamId, gradingSystem]);

  const activeExam = exams.find(e => e.id === selectedExamId);

  const handlePrint = () => {
     window.print();
  };

  const handleDownloadCSV = () => {
    const rows = [["Subject", "Max Marks", "Pass Marks", "Obtained", "Grade", "Status"]];
    stats.subjectsMatrix.forEach(m => {
      rows.push([
        m.subjects?.name || "",
        String(m.max),
        String(m.passTarget),
        String(m.marks_obtained),
        m.grade || "",
        m.isFailed ? "FAIL" : "PASS"
      ]);
    });
    rows.push([]);
    rows.push(["Total", String(stats.overallMaxAllowed), "", String(stats.overallTotalObtained), stats.overallGrade, stats.outcome]);
    rows.push(["Percentage", "", "", stats.globalPercentage + "%", "", ""]);
    rows.push(["Rank", "", "", rankData ? String(rankData.rank) : "—", "", ""]);

    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_card_${studentName.replace(/\s+/g, '_')}_${activeExam?.name?.replace(/\s+/g, '_') || 'exam'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Chart data
  const chartSubjects = stats.subjectsMatrix.map(m => ({
    name: m.subjects?.name || "Unknown",
    obtained: m.marks_obtained,
    max: m.max,
    isFailed: m.isFailed
  }));

  return (
    <div className="space-y-6">
      
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white/60 dark:bg-zinc-900/60 apple-card backdrop-blur-xl shadow-sm gap-4 print:hidden">
        <div>
           <select 
             value={selectedExamId} 
             onChange={(e) => setSelectedExamId(e.target.value)} 
             className="w-full sm:min-w-[300px] rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2"
           >
              {exams.map(ex => (
                 <option key={ex.id} value={ex.id} className="dark:bg-zinc-900">{ex.name}</option>
              ))}
              {exams.length === 0 && <option value="" className="dark:bg-zinc-900">No exams available</option>}
           </select>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadCSV} variant="outline" className="rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/50 dark:border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10 shadow-sm" disabled={!selectedExamId || currentMarks.length === 0}>
             <Download className="w-4 h-4 mr-2" /> CSV
          </Button>
          <Button onClick={handlePrint} variant="outline" className="rounded-xl border-zinc-200 text-indigo-700 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-indigo-100/50 dark:border-zinc-700/20 dark:text-zinc-300 dark:bg-zinc-900 dark:bg-zinc-100/10 shadow-sm" disabled={!selectedExamId || currentMarks.length === 0}>
             <Printer className="w-4 h-4 mr-2" /> Print / PDF
          </Button>
        </div>
      </div>

      {selectedExamId && currentMarks.length > 0 ? (
        <>
         {/* ─── Report Card ─── */}
         <div id="report-card-render" className="report-card-printable bg-white dark:bg-zinc-950 apple-card shadow-lg overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white px-8 md:px-12 py-8 print:from-gray-700 print:via-gray-800 print:to-gray-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight">Decan School</h1>
                  <p className="text-indigo-200 text-sm mt-1 print:text-gray-300">Official Academic Report Card</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-indigo-200 print:text-gray-300">Academic Session</p>
                  <p className="font-bold text-lg">{activeExam?.name}</p>
                  <p className="text-xs text-indigo-300 mt-1 print:text-gray-400">
                    {new Date(activeExam?.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} – {new Date(activeExam?.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Student Info Bar */}
            <div className="px-8 md:px-12 py-5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 print:bg-gray-50">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
                    {studentName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Student Name</p>
                    <p className="font-bold text-lg">{studentName}</p>
                  </div>
                </div>
                {/* Quick stats pills */}
                <div className="flex flex-wrap gap-2 items-center">
                  <div className={`px-4 py-2 rounded-xl text-sm font-bold ${
                    stats.outcome === 'PASS' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 print:bg-green-100 print:text-green-800' 
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 print:bg-red-100 print:text-red-800'
                  }`}>
                    {stats.outcome}
                  </div>
                  <div className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-100 text-indigo-700 dark:bg-zinc-900 dark:bg-zinc-100/15 dark:text-zinc-300 print:bg-blue-100 print:text-blue-800">
                    {stats.globalPercentage}%
                  </div>
                  {rankData && (
                    <div className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 flex items-center gap-1.5 print:bg-yellow-100 print:text-yellow-800">
                      {rankData.rank === 1 && <Trophy className="w-4 h-4" />}
                      Rank: {ordinal(rankData.rank)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Marks Table */}
            <div className="px-8 md:px-12 py-8">
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden print:border-gray-400 print:rounded-none">
                <Table>
                   <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50 print:bg-gray-100">
                      <TableRow className="print:border-b print:border-gray-400">
                         <TableHead className="font-bold">Subject</TableHead>
                         <TableHead className="text-center font-bold">Max Marks</TableHead>
                         <TableHead className="text-center font-bold">Pass Marks</TableHead>
                         <TableHead className="text-center font-bold">Obtained</TableHead>
                         <TableHead className="text-center font-bold">Grade</TableHead>
                         <TableHead className="text-center font-bold">Status</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                     {stats.subjectsMatrix.map((m: any, idx: number) => (
                        <TableRow key={m.subjects?.id || idx} className={`print:border-b print:border-gray-300 ${m.isFailed ? 'bg-rose-50/50 dark:bg-rose-500/5' : ''}`}>
                           <TableCell className="font-medium">{m.subjects?.name}</TableCell>
                           <TableCell className="text-center text-zinc-500">{m.max}</TableCell>
                           <TableCell className="text-center text-zinc-500">{m.passTarget}</TableCell>
                           <TableCell className={`text-center font-bold ${m.isFailed ? 'text-rose-600 dark:text-rose-400' : ''}`}>{m.marks_obtained}</TableCell>
                           <TableCell className="text-center">
                             <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${
                               m.grade === 'F' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'
                                 : m.grade === 'A+' || m.grade === 'A' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                 : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                             }`}>
                               {m.grade}
                             </span>
                           </TableCell>
                           <TableCell className="text-center">
                             <span className={`text-xs font-semibold ${m.isFailed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                               {m.isFailed ? 'FAIL' : 'PASS'}
                             </span>
                           </TableCell>
                        </TableRow>
                     ))}
                     {/* Totals Row */}
                     <TableRow className="bg-zinc-50 dark:bg-zinc-900/50 font-bold print:bg-gray-100 print:border-t-2 print:border-gray-500">
                       <TableCell className="font-bold">TOTAL</TableCell>
                       <TableCell className="text-center">{stats.overallMaxAllowed}</TableCell>
                       <TableCell className="text-center text-zinc-400">—</TableCell>
                       <TableCell className="text-center text-lg">{stats.overallTotalObtained}</TableCell>
                       <TableCell className="text-center">
                         <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-zinc-900 dark:bg-zinc-100/15 dark:text-zinc-300">
                           {stats.overallGrade}
                         </span>
                       </TableCell>
                       <TableCell className="text-center">
                         <span className={`font-bold ${stats.outcome === 'PASS' ? 'text-emerald-600' : 'text-rose-600'}`}>{stats.outcome}</span>
                       </TableCell>
                     </TableRow>
                   </TableBody>
                </Table>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="px-8 md:px-12 pb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-100 dark:border-zinc-700/20 print:bg-gray-50 print:border-gray-300">
                   <div className="text-xs text-zinc-900 dark:text-zinc-100 dark:text-zinc-300 font-medium uppercase tracking-wider mb-1">Total Score</div>
                   <div className="text-2xl font-black">{stats.overallTotalObtained} <span className="text-base text-zinc-400 font-medium">/ {stats.overallMaxAllowed}</span></div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-100 dark:border-emerald-500/20 print:bg-gray-50 print:border-gray-300">
                   <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider mb-1">Percentage</div>
                   <div className="text-2xl font-black">{stats.globalPercentage}%</div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-100 dark:border-amber-500/20 print:bg-gray-50 print:border-gray-300">
                   <div className="text-xs text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider mb-1">Class Rank</div>
                   <div className="text-2xl font-black flex items-center gap-2">
                      {rankData ? ordinal(rankData.rank) : '—'}
                      {rankData?.rank === 1 && <Trophy className="w-5 h-5 text-amber-500" />}
                   </div>
                </div>
                <div className={`p-4 rounded-xl border print:border-gray-300 ${
                  stats.outcome === 'PASS' 
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-600 print:bg-gray-200 print:text-black' 
                    : 'bg-gradient-to-br from-rose-500 to-pink-600 text-white border-rose-600 print:bg-gray-200 print:text-black'
                }`}>
                   <div className="text-xs opacity-80 font-medium uppercase tracking-wider mb-1">Result</div>
                   <div className="text-2xl font-black">{stats.outcome}</div>
                </div>
              </div>
            </div>

            {/* Failure Alert */}
            {stats.outcome === 'FAIL' && (
              <div className="mx-8 md:mx-12 mb-6">
                <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 print:border-gray-400 print:bg-white print:text-black">
                   <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                   <p className="text-sm font-medium">Student has not met the passing criteria in {stats.failedCount} subject{stats.failedCount > 1 ? 's' : ''}. Please consult with the class teacher for remedial support.</p>
                </div>
              </div>
            )}

            {/* Charts Section (print-visible) */}
            <div className="px-8 md:px-12 pb-8">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Subject Performance Chart */}
                <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 print:bg-white print:border-gray-300">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    <h3 className="font-semibold text-sm">Subject-wise Performance</h3>
                  </div>
                  <SubjectBarChart subjects={chartSubjects} />
                </div>

                {/* Grade Distribution */}
                <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 print:bg-white print:border-gray-300">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                    <h3 className="font-semibold text-sm">Grade Distribution</h3>
                  </div>
                  <GradeDistribution subjectsMatrix={stats.subjectsMatrix} gradingSystem={gradingSystem} />
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className="px-8 md:px-12 pb-10 pt-8">
              <div className="grid grid-cols-3 gap-8 text-center border-t border-zinc-200 dark:border-zinc-800 pt-12 print:border-black">
                <div>
                  <div className="w-40 border-b-2 border-zinc-300 dark:border-zinc-600 print:border-gray-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Class Teacher</p>
                </div>
                <div>
                  <div className="w-40 border-b-2 border-zinc-300 dark:border-zinc-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Examination Controller</p>
                </div>
                <div>
                  <div className="w-40 border-b-2 border-zinc-300 dark:border-zinc-600 print:border-gray-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Principal</p>
                </div>
              </div>
            </div>
         </div>
        </>
      ) : (
         <div className="apple-card p-12 text-center">
            <BarChart3 className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">No results available</p>
            <p className="text-sm text-zinc-400 mt-1">Results will appear here once marks have been entered.</p>
         </div>
      )}
    </div>
  );
}
