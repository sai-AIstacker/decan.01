"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";

const DAYS = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
];

export default function ParentTimetableView({
  childrenData,
  timeSlots,
  timetables,
  globalSubjects,
  teachers
}: {
  childrenData: any[];
  timeSlots: any[];
  timetables: any[];
  globalSubjects: any[];
  teachers: any[];
}) {
  const [selectedChildId, setSelectedChildId] = useState<string>(childrenData[0]?.student_id || "");

  const activeChildRow = childrenData.find(c => c.student_id === selectedChildId);
  const activeClassId = activeChildRow?.class_id;

  const getBlock = (day: number, slotId: string) => {
     if (!activeClassId) return null;
     return timetables.find(t => t.class_id === activeClassId && t.day_of_week === day && t.time_slot_id === slotId);
  };

  const getSubjectName = (subId: string) => globalSubjects.find(s => s.id === subId)?.name || "Unknown";
  const getTeacherName = (tId: string) => {
    const t = teachers.find(t => t.id === tId);
    return t ? t.full_name || t.email : "Unknown";
  };

  return (
    <div className="space-y-6">
      
      <div className="p-4 bg-white/50 dark:bg-zinc-900/50 apple-card backdrop-blur-xl shadow-sm inline-block">
         <Label htmlFor="childFilter" className="mr-3">Select Active Child Matrix:</Label>
         <select 
            id="childFilter" 
            value={selectedChildId} 
            onChange={(e) => setSelectedChildId(e.target.value)} 
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1 min-w-[200px]"
          >
            {childrenData.map(c => (
              <option key={c.student_id} value={c.student_id} className="dark:bg-zinc-900">
                {c.profiles?.full_name || c.profiles?.email} 
                {c.class_name ? ` (${c.class_name})` : ' (Unassigned)'}
              </option>
            ))}
            {childrenData.length === 0 && <option value="" className="dark:bg-zinc-900">No linked children.</option>}
         </select>
      </div>

      {!activeClassId ? (
         <div className="apple-card p-8 text-center">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Child is Not Enrolled</h3>
            <p className="text-zinc-500 mt-2">The selected student has not been mapped to a class roster for the active year context.</p>
         </div>
      ) : timeSlots.length === 0 ? (
         <div className="apple-card p-8 text-center">
            <h3 className="text-lg font-medium">No Schedule Configurations</h3>
            <p className="text-zinc-500 mt-2">The administration has not yet mapped the timeline grid.</p>
         </div>
      ) : (
         <div className="overflow-x-auto bg-white dark:bg-black apple-card relative">
            <table className="w-full text-sm text-left min-w-[800px]">
               <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                     <th className="p-4 font-semibold text-center border-r border-zinc-200 dark:border-zinc-800 w-32">Time</th>
                     {DAYS.map(d => (
                        <th key={d.id} className="p-4 font-semibold text-center">{d.name}</th>
                     ))}
                  </tr>
               </thead>
               <tbody>
                  {timeSlots.map((slot) => (
                     <tr key={slot.id} className="border-b border-zinc-200 dark:border-zinc-800 last:border-0">
                        <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20">
                           <div className="font-semibold">{slot.name}</div>
                           <div className="text-xs text-zinc-500">
                             {slot.start_time.substring(0,5)} - {slot.end_time.substring(0,5)}
                           </div>
                        </td>
                        {DAYS.map(d => {
                           const block = getBlock(d.id, slot.id);
                           return (
                             <td 
                               key={`${d.id}-${slot.id}`} 
                               className={`p-2 min-h-[80px] align-top transition-colors border-r border-zinc-200/50 dark:border-zinc-800/50 last:border-0 ${block ? '' : 'bg-white dark:bg-zinc-950/30'}`}
                             >
                               {block && (
                                  <div className="p-3 bg-fuchsia-50 dark:bg-fuchsia-500/10 border border-fuchsia-200 dark:border-fuchsia-500/30 rounded-xl shadow-sm h-full flex flex-col justify-center items-center text-center">
                                    <div className="font-bold text-fuchsia-700 dark:text-fuchsia-400">{getSubjectName(block.subject_id)}</div>
                                    <div className="text-xs text-fuchsia-600/70 dark:text-fuchsia-300/70 truncate w-full px-1">{getTeacherName(block.teacher_id)}</div>
                                  </div>
                               )}
                             </td>
                           )
                        })}
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      )}
    </div>
  );
}
