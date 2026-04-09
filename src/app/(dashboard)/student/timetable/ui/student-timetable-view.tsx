"use client";

const DAYS = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
];

export default function StudentTimetableView({
  timeSlots,
  timetables,
  globalSubjects,
  teachers
}: {
  timeSlots: any[];
  timetables: any[];
  globalSubjects: any[];
  teachers: any[];
}) {
  const getBlock = (day: number, slotId: string) => {
     return timetables.find(t => t.day_of_week === day && t.time_slot_id === slotId);
  };

  const getSubjectName = (subId: string) => globalSubjects.find(s => s.id === subId)?.name || "Unknown";
  const getTeacherName = (tId: string) => {
    const t = teachers.find(t => t.id === tId);
    return t ? t.full_name || t.email : "Unknown";
  };

  return (
    <div className="space-y-6">
      {timeSlots.length === 0 ? (
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
                                  <div className="p-3 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 rounded-xl shadow-sm h-full flex flex-col justify-center items-center text-center">
                                    <div className="font-bold text-violet-700 dark:text-violet-400">{getSubjectName(block.subject_id)}</div>
                                    <div className="text-xs text-violet-600/70 dark:text-violet-300/70 truncate w-full px-1">{getTeacherName(block.teacher_id)}</div>
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
