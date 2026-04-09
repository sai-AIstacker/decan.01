"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Copy } from "lucide-react";
import {
  copyTimetableToClassAdminAction,
  createTimeSlotAdminAction,
  deleteTimetableBlockAdminAction,
  moveTimetableBlockAdminAction,
  upsertTimetableBlockAdminAction,
} from "@/app/actions/timetable";

const DAYS = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
];

export default function TimetableManager({
  timeSlots,
  classes,
  globalSubjects,
  mappedSubjects,
  teachers,
  initialTimetables
}: {
  timeSlots: any[];
  classes: any[];
  globalSubjects: any[];
  mappedSubjects: any[];
  teachers: any[];
  initialTimetables: any[];
}) {
  const [timetables, setTimetables] = useState<any[]>(initialTimetables);
  const [slots, setSlots] = useState<any[]>(timeSlots);
  const [selectedClass, setSelectedClass] = useState<string>(classes[0]?.id || "");
  
  // UI States
  const [slotEditorOpen, setSlotEditorOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<{ day: number, slotId: string } | null>(null);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignDay, setAssignDay] = useState<number>(1);
  const [assignSlotId, setAssignSlotId] = useState<string>("");
  const [quickDay, setQuickDay] = useState<number>(1);
  const [quickSlotId, setQuickSlotId] = useState<string>("");
  const [quickSubjectId, setQuickSubjectId] = useState<string>("");
  const [quickTeacherId, setQuickTeacherId] = useState<string>("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const router = useRouter();
  
  const supabase = createClient();

  useEffect(() => {
    setTimetables(initialTimetables);
  }, [initialTimetables]);

  useEffect(() => {
    setSlots(timeSlots);
  }, [timeSlots]);

  useEffect(() => {
    if (classes.length === 0) return;
    const stillValid = classes.some((c) => c.id === selectedClass);
    if (!selectedClass || !stillValid) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass]);

  useEffect(() => {
    if (!quickSlotId && slots.length > 0) {
      setQuickSlotId(slots[0].id);
    }
  }, [slots, quickSlotId]);

  const handleRefresh = async () => {
    const { data } = await supabase.from("timetables").select("*");
    if (data) setTimetables(data);
  };

  const handleRefreshSlots = async () => {
    const { data } = await supabase.from("time_slots").select("*").order("order_index");
    if (data) setSlots(data);
  };

  const handleCreateSlot = async (formData: FormData) => {
    const name = formData.get("name") as string;
    const start_time = formData.get("start_time") as string;
    const end_time = formData.get("end_time") as string;
    const order_index = parseInt(formData.get("order_index") as string);
    try {
      await createTimeSlotAdminAction({
        name,
        startTime: start_time,
        endTime: end_time,
        orderIndex: order_index,
      });
      await handleRefreshSlots();
      router.refresh();
      setSlotEditorOpen(false);
    } catch (e: any) {
      alert("Error adding slot: " + e.message);
    }
  };

  const onCreateSlotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleCreateSlot(new FormData(e.currentTarget));
  };

  const handleAssignBlock = async (formData: FormData) => {
    const classId = String(formData.get("class_id") || selectedClass || "");
    const dayFromForm = Number(formData.get("day_of_week"));
    const slotIdFromForm = String(formData.get("time_slot_id") || assignSlotId || activeCell?.slotId || "");
    const resolvedDay = Number.isInteger(dayFromForm) && dayFromForm > 0 ? dayFromForm : assignDay || activeCell?.day;

    if (!resolvedDay || !slotIdFromForm || !classId) {
      setAssignError("Please select a class and timetable cell before assigning.");
      return;
    }
    
    const subject_id = formData.get("subject_id") as string;
    const teacher_id = formData.get("teacher_id") as string;
    
    if (!subject_id || !teacher_id) {
      setAssignError("Both subject and teacher are required.");
      return;
    }

    try {
       setAssigning(true);
       setAssignError(null);
       await upsertTimetableBlockAdminAction({
         blockId: currentBlockId,
         classId,
         subjectId: subject_id,
         teacherId: teacher_id,
         dayOfWeek: resolvedDay,
         timeSlotId: slotIdFromForm,
       });
       await handleRefresh();
       router.refresh();
       setAssignOpen(false);
       setActiveCell(null);
       setCurrentBlockId(null);
       setAssignError(null);
    } catch (e: any) {
       setAssignError(e?.message || "Failed to assign timetable block.");
    } finally {
       setAssigning(false);
    }
  };

  const onAssignBlockSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleAssignBlock(new FormData(e.currentTarget));
  };

  const handleQuickAssign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClass || !quickDay || !quickSlotId || !quickSubjectId || !quickTeacherId) {
      setQuickError("Please select class, day, slot, subject, and teacher.");
      return;
    }
    try {
      setQuickSaving(true);
      setQuickError(null);
      await upsertTimetableBlockAdminAction({
        classId: selectedClass,
        subjectId: quickSubjectId,
        teacherId: quickTeacherId,
        dayOfWeek: quickDay,
        timeSlotId: quickSlotId,
      });
      await handleRefresh();
      router.refresh();
    } catch (err: any) {
      setQuickError(err?.message || "Failed to assign timetable block.");
    } finally {
      setQuickSaving(false);
    }
  };

  const handleDropBlock = async () => {
    if (!currentBlockId) return;
    try {
      await deleteTimetableBlockAdminAction(currentBlockId);
      await handleRefresh();
      router.refresh();
      setAssignOpen(false);
      setActiveCell(null);
      setCurrentBlockId(null);
    } catch(e: any) {
      alert(e.message);
    }
  };

  const handleCopyTimetable = async (formData: FormData) => {
     const target_class_id = formData.get("target_class_id") as string;
     if (!target_class_id || target_class_id === selectedClass) {
        alert("Select a valid distinct target class.");
        return;
     }

     if (!confirm("This will overwrite existing timetable blocks for the target class safely resolving conflicts. Proceed?")) return;

     // Fetch source timetable
     const sourceItems = timetables.filter(t => t.class_id === selectedClass);
     
     if (sourceItems.length === 0) {
        alert("Source class has no timetable.");
        return;
     }

     try {
      await copyTimetableToClassAdminAction(selectedClass, target_class_id);
      await handleRefresh();
      router.refresh();
       setCopyOpen(false);
       alert("Timetable copied successfully!");
     } catch (e: any) {
       alert("Bulk Clone Error: " + e.message);
     }
  };

  const onCopyTimetableSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleCopyTimetable(new FormData(e.currentTarget));
  };

  // Drag and Drop Logic
  const [dragInfo, setDragInfo] = useState<{ id: string } | null>(null);

  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    e.dataTransfer.setData("blockId", blockId);
    setDragInfo({ id: blockId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = async (e: React.DragEvent, day: number, slotId: string) => {
    e.preventDefault();
    const blockId = e.dataTransfer.getData("blockId");
    setDragInfo(null);
    if (!blockId) return;

    try {
      await moveTimetableBlockAdminAction(blockId, day, slotId);
      await handleRefresh();
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Render logic helpers
  const getBlock = (day: number, slotId: string) => {
     return timetables.find(t => t.class_id === selectedClass && t.day_of_week === day && t.time_slot_id === slotId);
  };

  const getSubjectName = (subId: string) => globalSubjects.find(s => s.id === subId)?.name || "Unknown";
  const getTeacherName = (tId: string) => teachers.find(t => t.id === tId)?.full_name || teachers.find(t => t.id === tId)?.email || "Unknown";

  // Prefer class-specific mappings; if none exist, allow global subjects as fallback.
  const permittedClassSubjects = mappedSubjects.filter(m => m.class_id === selectedClass);
  const subjectOptions =
    permittedClassSubjects.length > 0
      ? permittedClassSubjects.map((m) => ({
          id: m.subject_id,
          name: getSubjectName(m.subject_id),
        }))
      : globalSubjects.map((s) => ({
          id: s.id,
          name: s.name,
        }));

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between gap-4 p-4 bg-white/50 dark:bg-zinc-900/50 apple-card backdrop-blur-xl shadow-sm">
        <div className="flex items-center gap-4">
           <div className="min-w-[200px]">
             <Label>Context Target Class</Label>
             <select 
               value={selectedClass} 
               onChange={(e) => setSelectedClass(e.target.value)} 
               className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1"
             >
               {classes.map(c => (
                 <option key={c.id} value={c.id} className="dark:bg-zinc-900">{c.name} {c.section}</option>
               ))}
               {classes.length === 0 && <option value="" className="dark:bg-zinc-900">No classes found</option>}
             </select>
           </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
           <Button variant="outline" onClick={() => setCopyOpen(true)} className="rounded-xl" disabled={!selectedClass}>
              <Copy className="w-4 h-4 mr-2" /> Clone Timetable
           </Button>
           <Button variant="outline" onClick={() => setSlotEditorOpen(true)} className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Add Time Slot
           </Button>
        </div>
      </div>

      <form onSubmit={handleQuickAssign} className="apple-card">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">Quick Assign Timetable (No Cell Click Needed)</h3>
          <p className="text-xs text-zinc-500">Select class, day, slot, subject, and teacher, then assign directly.</p>
        </div>
        {classes.length === 0 ? (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            No classes available. Create classes first in Admin - Classes.
          </p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-5">
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2">
            <option value="" className="dark:bg-zinc-900">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id} className="dark:bg-zinc-900">{c.name} {c.section}</option>
            ))}
          </select>
          <select value={quickDay} onChange={(e) => setQuickDay(Number(e.target.value))} className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2">
            {DAYS.map((d) => (
              <option key={d.id} value={d.id} className="dark:bg-zinc-900">{d.name}</option>
            ))}
          </select>
          <select value={quickSlotId} onChange={(e) => setQuickSlotId(e.target.value)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2">
            <option value="" className="dark:bg-zinc-900">Select slot</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id} className="dark:bg-zinc-900">{s.name}</option>
            ))}
          </select>
          <select value={quickSubjectId} onChange={(e) => setQuickSubjectId(e.target.value)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2">
            <option value="" className="dark:bg-zinc-900">Select subject</option>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id} className="dark:bg-zinc-900">{s.name}</option>
            ))}
          </select>
          <select value={quickTeacherId} onChange={(e) => setQuickTeacherId(e.target.value)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2">
            <option value="" className="dark:bg-zinc-900">Select teacher</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id} className="dark:bg-zinc-900">{t.full_name || t.email}</option>
            ))}
          </select>
        </div>
        {quickError ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{quickError}</p> : null}
        <div className="mt-3">
          <Button type="submit" disabled={quickSaving || classes.length === 0}>{quickSaving ? "Assigning..." : "Assign Timetable Block"}</Button>
        </div>
      </form>

      {slots.length === 0 ? (
         <div className="apple-card p-8 text-center">
            <h3 className="text-lg font-medium">No Time Slots Configured</h3>
            <p className="text-zinc-500 mt-2 mb-4">You must define explicit physical hour bounds before mapping schedules.</p>
            <Button onClick={() => setSlotEditorOpen(true)}>Create First Slot</Button>
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
                  {slots.map((slot) => (
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
                               className={`p-2 relative min-h-[80px] align-top transition-colors border-r border-zinc-200/50 dark:border-zinc-800/50 last:border-0 ${block ? '' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30 bg-white dark:bg-zinc-950/30'} cursor-pointer group`}
                               onDragOver={handleDragOver}
                               onDrop={(e) => handleDrop(e, d.id, slot.id)}
                               onClick={() => {
                                  setAssignError(null);
                                  setAssignDay(d.id);
                                  setAssignSlotId(slot.id);
                                  setActiveCell({ day: d.id, slotId: slot.id });
                                  setCurrentBlockId(block ? block.id : null);
                                  setAssignOpen(true);
                               }}
                             >
                               {block ? (
                                  <div 
                                    className="p-3 bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-900 dark:bg-zinc-100/10 border border-zinc-200 dark:border-zinc-700/30 rounded-xl shadow-sm h-full flex flex-col justify-center items-center text-center cursor-grab active:cursor-grabbing hover:border-indigo-400 transition-colors"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, block.id)}
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       setAssignError(null);
                                       setAssignDay(d.id);
                                       setAssignSlotId(slot.id);
                                       setActiveCell({ day: d.id, slotId: slot.id });
                                       setCurrentBlockId(block.id);
                                       setAssignOpen(true);
                                    }}
                                  >
                                    <div className="font-bold text-indigo-700 dark:text-zinc-300">{getSubjectName(block.subject_id)}</div>
                                    <div className="text-xs text-zinc-900 dark:text-zinc-100/70 dark:text-zinc-300/70 truncate w-full px-1">{getTeacherName(block.teacher_id)}</div>
                                  </div>
                               ) : (
                                  <div className="w-full h-full min-h-[60px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Plus className="w-5 h-5 text-zinc-400" />
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

      {/* Editor Overlays */}
      <Dialog open={slotEditorOpen} onOpenChange={setSlotEditorOpen}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Declare Time Slot</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreateSlotSubmit} className="space-y-4">
               <div>
                 <Label>Slot Display Name</Label>
                 <Input name="name" placeholder="e.g. Period 1" required />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label>Start Time</Label>
                   <Input name="start_time" type="time" required />
                 </div>
                 <div>
                   <Label>End Time</Label>
                   <Input name="end_time" type="time" required />
                 </div>
               </div>
               <div>
                  <Label>Sequential Order Index</Label>
                  <Input type="number" name="order_index" defaultValue={slots.length + 1} required />
               </div>
               <Button type="submit" className="w-full">Initialize Block</Button>
            </form>
         </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>{currentBlockId ? "Modify Schedule" : "Assign Block Target"}</DialogTitle>
            </DialogHeader>
            
            <form
              key={`${activeCell?.day ?? "na"}-${activeCell?.slotId ?? "na"}-${currentBlockId ?? "new"}`}
              onSubmit={onAssignBlockSubmit}
              className="space-y-4"
            >
               <input type="hidden" name="class_id" value={selectedClass || ""} />
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <Label>Day</Label>
                   <select
                     name="day_of_week"
                     value={assignDay}
                     onChange={(e) => setAssignDay(Number(e.target.value))}
                     className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1"
                   >
                     {DAYS.map((d) => (
                       <option key={d.id} value={d.id} className="dark:bg-zinc-900">{d.name}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <Label>Time Slot</Label>
                   <select
                     name="time_slot_id"
                     value={assignSlotId}
                     onChange={(e) => setAssignSlotId(e.target.value)}
                     className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1"
                   >
                     <option value="" className="dark:bg-zinc-900">Select slot</option>
                     {slots.map((s) => (
                       <option key={s.id} value={s.id} className="dark:bg-zinc-900">{s.name}</option>
                     ))}
                   </select>
                 </div>
               </div>
               <div>
                 <Label>Mapping Context: Subject Template</Label>
                 <select 
                   name="subject_id" 
                   defaultValue={currentBlockId && activeCell ? getBlock(activeCell.day, activeCell.slotId)?.subject_id : ""}
                   className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1"
                 >
                    <option value="" className="dark:bg-zinc-900">Select subject</option>
                    {subjectOptions.map((subject) => (
                       <option key={subject.id} value={subject.id} className="dark:bg-zinc-900">{subject.name}</option>
                    ))}
                 </select>
               </div>
               <div>
                 <Label>Designated Explicit Teacher</Label>
                 <select 
                   name="teacher_id" 
                   defaultValue={currentBlockId && activeCell ? getBlock(activeCell.day, activeCell.slotId)?.teacher_id : ""}
                   className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1"
                 >
                    <option value="" className="dark:bg-zinc-900">Select teacher</option>
                    {teachers.map(t => (
                       <option key={t.id} value={t.id} className="dark:bg-zinc-900">{t.full_name || t.email}</option>
                    ))}
                 </select>
                 <p className="text-xs text-zinc-500 mt-1">Note: This engine will actively block explicit collisions directly during the transaction cycle if this individual is currently operating in another room block.</p>
               </div>

               {assignError ? (
                 <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                   {assignError}
                 </p>
               ) : null}

               <div className="flex gap-2 pt-2">
                 {currentBlockId && (
                   <Button type="button" variant="destructive" className="w-full" onClick={handleDropBlock}>Remove</Button>
                 )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={assigning}
                >
                  {assigning ? "Saving..." : currentBlockId ? "Update Node" : "Mount Integration"}
                </Button>
               </div>
            </form>
         </DialogContent>
      </Dialog>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Bulk Template Cloning</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCopyTimetableSubmit} className="space-y-4">
               <p className="text-sm text-zinc-600">Clone the entire active timetable of <strong>{classes.find(c => c.id === selectedClass)?.name}</strong> into an explicit independent destination class wrapper.</p>
               <div>
                 <Label>Destination Anchor Class</Label>
                 <select 
                   name="target_class_id"
                   required
                   className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1"
                 >
                   <option value="" className="dark:bg-zinc-900">Select...</option>
                   {classes.filter(c => c.id !== selectedClass).map(c => (
                     <option key={c.id} value={c.id} className="dark:bg-zinc-900">{c.name} {c.section}</option>
                   ))}
                 </select>
               </div>
               <Button type="submit" className="w-full">Execute Deep Clone Strategy</Button>
            </form>
         </DialogContent>
      </Dialog>
    </div>
  );
}
