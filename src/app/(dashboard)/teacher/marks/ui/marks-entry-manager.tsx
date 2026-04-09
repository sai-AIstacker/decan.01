"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Save, CheckCircle2, AlertTriangle, Users, BookOpen } from "lucide-react";
import { triggerAutomationEvent } from "@/lib/actions/notifications";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

export default function MarksEntryManager({
  exams,
  examSubjects,
  gradingSystem,
  homeClassIds,
  specificSubjects
}: {
  exams: any[];
  examSubjects: any[];
  gradingSystem: any[];
  homeClassIds: string[];
  specificSubjects: any[];
}) {
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [marksInputs, setMarksInputs] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const supabase = createClient();

  const getPermittedSubjects = () => {
    if (!selectedExamId) return [];
    const ex = exams.find(e => e.id === selectedExamId);
    if (!ex) return [];

    const mappedSettings = examSubjects.filter(es => es.exam_id === selectedExamId);

    const isHr = homeClassIds.includes(ex.class_id);
    if (isHr) return mappedSettings;
    
    return mappedSettings.filter(ms => specificSubjects.some(ss => ss.class_id === ex.class_id && ss.subject_id === ms.subject_id));
  };

  const permittedSubjects = getPermittedSubjects();
  const currentExamSubject = examSubjects.find(es => es.exam_id === selectedExamId && es.subject_id === selectedSubjectId);
  const maxMarks = currentExamSubject?.max_marks || 100;
  const passMarks = currentExamSubject?.pass_marks || 35;

  useEffect(() => {
    if (selectedExamId && permittedSubjects.length > 0) {
      if (!selectedSubjectId || !permittedSubjects.some(s => s.subject_id === selectedSubjectId)) {
         setSelectedSubjectId(permittedSubjects[0].subject_id);
      }
    } else {
      setSelectedSubjectId("");
    }
  }, [selectedExamId]);

  useEffect(() => {
    if (selectedExamId && selectedSubjectId) {
       loadStudentsAndMarks();
    } else {
       setStudents([]);
       setMarksInputs({});
    }
    setSaveStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExamId, selectedSubjectId]);

  async function loadStudentsAndMarks() {
    const ex = exams.find(e => e.id === selectedExamId);
    if (!ex) return;

    const { data: enrolls } = await supabase
      .from("enrollments")
      .select("student_id, profiles(full_name, email)")
      .eq("class_id", ex.class_id)
      .eq("status", "active");

    const rootStubs = enrolls || [];
    setStudents(rootStubs);

    const { data: existingMap } = await supabase
      .from("marks")
      .select("*")
      .eq("exam_id", selectedExamId)
      .eq("subject_id", selectedSubjectId);

    const inputDict: Record<string, string> = {};
    if (existingMap) {
       existingMap.forEach(r => {
          inputDict[r.student_id] = String(r.marks_obtained);
       });
    }
    setMarksInputs(inputDict);
  };

  const handleInputChange = (studentId: string, val: string) => {
    if (val !== "" && isNaN(Number(val))) return;
    if (Number(val) > maxMarks) return; 
    if (Number(val) < 0) return;
    setMarksInputs(prev => ({ ...prev, [studentId]: val }));
    setSaveStatus("idle");
  };

  const calculateGrade = (markStr: string) => {
    if (!markStr) return { grade: null, remark: null };
    const numericMark = parseFloat(markStr);
    const percentage = (numericMark / maxMarks) * 100;
    
    for (const sys of gradingSystem) {
       if (percentage >= sys.min_percentage && percentage <= sys.max_percentage) {
          return { grade: sys.grade, remark: sys.remark };
       }
    }
    return { grade: 'F', remark: 'Fail' };
  };

  const handleBulkSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    
    const payloads: any[] = [];
    for (const student of students) {
       const mValue = marksInputs[student.student_id];
       if (mValue !== undefined && mValue !== "") {
          const { grade, remark } = calculateGrade(mValue);
          payloads.push({
            exam_id: selectedExamId,
            student_id: student.student_id,
            subject_id: selectedSubjectId,
            marks_obtained: parseFloat(mValue),
            grade,
            remarks: remark
          });
       }
    }

    if (payloads.length === 0) {
      toast.warning("No marks actively entered.");
      setIsSaving(false);
      return;
    }

    const savePromise = async () => {
      const { error } = await supabase.from("marks").upsert(payloads, {
         onConflict: 'exam_id, student_id, subject_id'
      });
      if (error) throw error;

      // Handle explicitly structured Automation Hook mapped securely natively!
      payloads.forEach(p => {
         triggerAutomationEvent('result_published', p.student_id, '/student/results');
      });

      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return "Evaluation registry forcefully mapped.";
    };

    toast.promise(savePromise(), {
       loading: "Evaluating structural dependencies mapping explicitly...",
       success: (msg) => msg,
       error: (err) => {
          setSaveStatus("error");
          return "Mutation completely rejected: " + err.message;
       },
       finally: () => setIsSaving(false)
    });
  };

  // Stats
  const enteredCount = useMemo(() => {
    return students.filter(s => marksInputs[s.student_id] !== undefined && marksInputs[s.student_id] !== "").length;
  }, [students, marksInputs]);

  const failedCount = useMemo(() => {
    return students.filter(s => {
      const val = marksInputs[s.student_id];
      if (!val) return false;
      return parseFloat(val) < passMarks;
    }).length;
  }, [students, marksInputs, passMarks]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5 bg-white/60 dark:bg-zinc-900/60 apple-card backdrop-blur-xl shadow-sm">
        <div>
           <Label>Select Exam</Label>
           <select 
             value={selectedExamId} 
             onChange={(e) => setSelectedExamId(e.target.value)} 
             className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1"
           >
              <option value="" className="dark:bg-zinc-900">Choose an exam...</option>
              {exams.map(ex => (
                 <option key={ex.id} value={ex.id} className="dark:bg-zinc-900">{ex.name} — {ex.classes?.name} {ex.classes?.section}</option>
              ))}
           </select>
        </div>
        <div>
           <Label>Select Subject</Label>
           <select 
             value={selectedSubjectId} 
             onChange={(e) => setSelectedSubjectId(e.target.value)} 
             className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1"
             disabled={!selectedExamId || permittedSubjects.length === 0}
           >
              {permittedSubjects.map(ps => (
                 <option key={ps.subject_id} value={ps.subject_id} className="dark:bg-zinc-900">
                   {ps.subjects?.name} (Max: {ps.max_marks})
                 </option>
              ))}
              {permittedSubjects.length === 0 && <option value="" className="dark:bg-zinc-900">No subjects available</option>}
           </select>
        </div>
        <div className="flex items-end">
           <Button 
             onClick={handleBulkSave} 
             disabled={isSaving || students.length === 0 || !selectedSubjectId} 
             className={`w-full transition-all hover:-translate-y-0.5 rounded-xl h-10 ${
               saveStatus === "success" 
                 ? "bg-[#1d1d1f] hover:bg-[#3a3a3c] shadow-lg shadow-emerald-500/20" 
                 : "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
             } text-white`}
           >
              {saveStatus === "success" ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved Successfully</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> {isSaving ? "Saving..." : "Save All Marks"}</>
              )}
           </Button>
        </div>
      </div>

      {/* Progress & Stats Bar */}
      {selectedExamId && selectedSubjectId && students.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 px-5 py-3 bg-white/60 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-500">Students:</span>
            <span className="font-semibold">{students.length}</span>
          </div>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-zinc-500">Entered:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{enteredCount}/{students.length}</span>
          </div>
          {failedCount > 0 && (
            <>
              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span className="text-zinc-500">Below pass marks:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">{failedCount}</span>
              </div>
            </>
          )}
          {/* Progress bar */}
          <div className="flex-1 min-w-[120px]">
            <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${students.length > 0 ? (enteredCount / students.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Marks Entry Table */}
      {selectedExamId && selectedSubjectId && students.length > 0 && (
         <div className="bg-white/60 dark:bg-zinc-900/60 apple-card backdrop-blur-xl shadow-sm overflow-hidden">
            <div className="p-5 pb-0">
              <h3 className="font-semibold text-lg">Marks Entry</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Maximum marks: <span className="font-semibold text-foreground">{maxMarks}</span> · Pass marks: <span className="font-semibold text-foreground">{passMarks}</span>
              </p>
            </div>
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/80 dark:bg-zinc-800/50">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-36 text-center">Marks</TableHead>
                    <TableHead className="w-20 text-center">Grade</TableHead>
                    <TableHead className="w-28 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, idx) => {
                    const currentVal = marksInputs[student.student_id] || "";
                    const autoGrade = calculateGrade(currentVal);
                    const isFailed = currentVal !== "" && parseFloat(currentVal) < passMarks;
                    
                    return (
                      <TableRow 
                        key={student.student_id} 
                        className={`transition-colors ${isFailed ? 'bg-rose-50/70 dark:bg-rose-500/5 hover:bg-rose-50 dark:hover:bg-rose-500/10' : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30'}`}
                      >
                        <TableCell className="text-center text-zinc-400 text-sm font-medium">{idx + 1}</TableCell>
                        <TableCell className="font-medium">
                          {student.profiles?.full_name || student.profiles?.email}
                        </TableCell>
                        <TableCell className="text-center">
                          <Input 
                            type="number"
                            min="0"
                            max={maxMarks}
                            placeholder={`0–${maxMarks}`}
                            value={currentVal}
                            onChange={(e) => handleInputChange(student.student_id, e.target.value)}
                            className={`w-28 mx-auto text-center bg-white dark:bg-black ${isFailed ? 'border-rose-300 dark:border-rose-500/30 focus:ring-rose-400' : ''}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {currentVal && (
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                              autoGrade.grade === 'F' 
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' 
                                : autoGrade.grade === 'A+' || autoGrade.grade === 'A'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                            }`}>
                              {autoGrade.grade}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {currentVal && (
                            <span className={`text-xs font-medium ${isFailed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {isFailed ? '✗ Fail' : '✓ Pass'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
         </div>
      )}

      {selectedExamId && students.length === 0 && (
         <EmptyState 
            title="Class registry completely missing boundaries"
            description="No active enrollments mapping physically to the target class block evaluating logic."
            icon={Users}
         />
      )}
    </div>
  );
}
