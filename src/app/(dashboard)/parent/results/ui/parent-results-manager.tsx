"use client";

import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Users } from "lucide-react";
import ReportCardView from "@/app/(dashboard)/student/results/ui/report-card";

export default function ParentResultsManager({
  childrenData,
  marksData,
  examSubjects,
  gradingSystem = []
}: {
  childrenData: any[];
  marksData: any[];
  examSubjects: any[];
  gradingSystem?: any[];
}) {
  const [selectedChildId, setSelectedChildId] = useState<string>(childrenData[0]?.student_id || "");

  const activeChild = childrenData.find(c => c.student_id === selectedChildId);
  const activeStudentName = activeChild?.profiles?.full_name || activeChild?.profiles?.email || "Unknown";

  const studentMarks = useMemo(() => {
    return marksData.filter(m => m.student_id === selectedChildId);
  }, [marksData, selectedChildId]);

  const exams = useMemo(() => {
     const map = new Map();
     studentMarks.forEach(m => {
        if (m.exams && !map.has(m.exam_id)) {
           map.set(m.exam_id, m.exams);
        }
     });
     return Array.from(map.values());
  }, [studentMarks]);

  return (
    <div className="space-y-6">
      
      {/* Child Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-white/60 dark:bg-zinc-900/60 apple-card backdrop-blur-xl shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center text-white font-bold shadow-lg shadow-rose-500/20">
            {activeStudentName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Viewing results for</p>
            <p className="font-semibold">{activeStudentName}</p>
          </div>
        </div>
        {childrenData.length > 1 && (
          <div className="sm:ml-auto">
            <select 
               value={selectedChildId} 
               onChange={(e) => setSelectedChildId(e.target.value)} 
               className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 min-w-[200px]"
             >
               {childrenData.map(c => (
                 <option key={c.student_id} value={c.student_id} className="dark:bg-zinc-900">
                   {c.profiles?.full_name || c.profiles?.email} 
                 </option>
               ))}
            </select>
          </div>
        )}
      </div>

      {selectedChildId ? (
         <ReportCardView 
           studentId={selectedChildId}
           studentName={activeStudentName}
           exams={exams}
           marksData={studentMarks}
           examSubjects={examSubjects}
           gradingSystem={gradingSystem}
         />
      ) : (
         <div className="apple-card p-12 text-center">
            <Users className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">No children linked</p>
            <p className="text-sm text-zinc-400 mt-1">Please contact the school administration to link your child&apos;s account.</p>
         </div>
      )}
    </div>
  );
}
