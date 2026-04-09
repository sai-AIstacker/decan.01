"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, Settings2, X, CalendarDays, BookOpen, Loader2,
  Clock, GraduationCap, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { createExamAdminAction } from "@/app/actions/exams";

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "Unit Test":  { bg: "bg-[#007aff]/10", text: "text-[#007aff]",  dot: "bg-[#007aff]"  },
  "Mid-Term":   { bg: "bg-[#ff9f0a]/10", text: "text-[#ff9f0a]",  dot: "bg-[#ff9f0a]"  },
  "Final":      { bg: "bg-[#ff3b30]/10", text: "text-[#ff3b30]",  dot: "bg-[#ff3b30]"  },
  "Quiz":       { bg: "bg-[#34c759]/10", text: "text-[#34c759]",  dot: "bg-[#34c759]"  },
  "Assignment": { bg: "bg-[#bf5af2]/10", text: "text-[#bf5af2]",  dot: "bg-[#bf5af2]"  },
};
const defaultColor = { bg: "bg-[#6e6e73]/10", text: "text-[#6e6e73]", dot: "bg-[#6e6e73]" };

function getTypeColor(typeName?: string) {
  if (!typeName) return defaultColor;
  for (const [k, v] of Object.entries(TYPE_COLORS)) {
    if (typeName.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return defaultColor;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ExamManager({
  initialExams, examTypes, terms, classes, subjects, activeYearId,
}: {
  initialExams: any[]; examTypes: any[]; terms: any[];
  classes: any[]; subjects: any[]; activeYearId: string | undefined;
}) {
  const [exams, setExams]                       = useState(initialExams);
  const [isExamOpen, setIsExamOpen]             = useState(false);
  const [isSubjectOpen, setIsSubjectOpen]       = useState(false);
  const [activeExam, setActiveExam]             = useState<any>(null);
  const [examSubjects, setExamSubjects]         = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [deletingId, setDeletingId]             = useState<string | null>(null);
  const supabase = createClient();
  const router   = useRouter();

  // ── Create exam ──────────────────────────────────────────────
  const handleCreateExam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name         = fd.get("name") as string;
    const exam_type_id = fd.get("exam_type_id") as string;
    const class_id     = fd.get("class_id") as string;
    const term_id      = fd.get("term_id") as string;
    const start_date   = fd.get("start_date") as string;
    const end_date     = fd.get("end_date") as string;

    if (!activeYearId || !class_id || !exam_type_id) {
      toast.error("Select a class and exam type.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createExamAdminAction({ name, examTypeId: exam_type_id, classId: class_id, academicYearId: activeYearId, termId: term_id || null, startDate: start_date, endDate: end_date });
      await refreshExams();
      setIsExamOpen(false);
      (e.target as HTMLFormElement).reset();
      toast.success(`Exam "${name}" created.`);
    } catch (err: any) { toast.error(err.message); }
    finally { setIsSubmitting(false); }
  };

  // ── Delete exam ──────────────────────────────────────────────
  const handleDeleteExam = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This removes all marks and subject mappings.`)) return;
    setDeletingId(id);
    try {
      await supabase.from("exams").delete().eq("id", id);
      setExams(prev => prev.filter(e => e.id !== id));
      router.refresh();
      toast.success("Exam deleted.");
    } catch (err: any) { toast.error(err.message); }
    finally { setDeletingId(null); }
  };

  // ── Subject config ───────────────────────────────────────────
  const openSubjectConfig = async (exam: any) => {
    setActiveExam(exam);
    const { data } = await supabase.from("exam_subjects").select("*, subjects(name,code)").eq("exam_id", exam.id);
    setExamSubjects(data || []);
    setIsSubjectOpen(true);
  };

  const handleAddSubject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeExam) return;
    const fd         = new FormData(e.currentTarget);
    const subject_id = fd.get("subject_id") as string;
    const max_marks  = parseInt(fd.get("max_marks") as string);
    const pass_marks = parseInt(fd.get("pass_marks") as string);
    const exam_date  = fd.get("exam_date") as string;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("exam_subjects").insert({ exam_id: activeExam.id, subject_id, max_marks, pass_marks, exam_date: exam_date || null });
      if (error) throw error;
      const { data } = await supabase.from("exam_subjects").select("*, subjects(name,code)").eq("exam_id", activeExam.id);
      setExamSubjects(data || []);
      (e.target as HTMLFormElement).reset();
      toast.success("Subject added.");
    } catch (err: any) { toast.error(err.message); }
    finally { setIsSubmitting(false); }
  };

  const handleRemoveSubject = async (id: string) => {
    await supabase.from("exam_subjects").delete().eq("id", id);
    setExamSubjects(prev => prev.filter(s => s.id !== id));
  };

  const refreshExams = async () => {
    const { data } = await supabase.from("exams").select("*,exam_types(name),classes(name,section),terms(name)").eq("academic_year_id", activeYearId || "00000000-0000-0000-0000-000000000000").order("start_date", { ascending: false });
    if (data) setExams(data);
  };

  const activeExamColor = activeExam ? getTypeColor(activeExam.exam_types?.name) : defaultColor;

  return (
    <div className="space-y-5">

      {/* ── Stats bar ── */}
      <div className="apple-card p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[14px] bg-[#1d1d1f] flex items-center justify-center">
            <CalendarDays size={20} className="text-white" />
          </div>
          <div>
            <p className="label-xs">Active Exams</p>
            <p className="text-[28px] font-black text-[var(--foreground)] mono-num leading-none mt-0.5">{exams.length}</p>
          </div>
          {/* Type breakdown */}
          <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-[var(--border)]">
            {examTypes.slice(0, 4).map(et => {
              const count = exams.filter(e => e.exam_type_id === et.id).length;
              const c = getTypeColor(et.name);
              return (
                <div key={et.id} className={`px-3 py-1.5 rounded-full ${c.bg} flex items-center gap-1.5`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                  <span className={`text-[11px] font-bold ${c.text}`}>{et.name}</span>
                  <span className={`text-[11px] font-black mono-num ${c.text}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create button */}
        <Dialog open={isExamOpen} onOpenChange={setIsExamOpen}>
          <DialogTrigger asChild>
            <button
              disabled={!activeYearId || classes.length === 0}
              style={{ background: "#1d1d1f", color: "#fff", border: "2px solid #1d1d1f", borderRadius: 14, padding: "10px 20px", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", opacity: (!activeYearId || classes.length === 0) ? 0.4 : 1 }}>
              <Plus size={15} /> Create Exam
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Exam</DialogTitle>
              <DialogDescription>Schedule an exam for the active academic year.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateExam} className="space-y-4">
              <div className="space-y-1">
                <Label>Exam Name</Label>
                <Input name="name" placeholder="e.g. Mid-Term Exam — March 2026" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Exam Type</Label>
                  <select name="exam_type_id" required className="w-full h-10 rounded-[10px] border border-[var(--border)] bg-[var(--surface-1)] px-3 text-[13px] outline-none focus:border-[#1d1d1f]">
                    {examTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Term (optional)</Label>
                  <select name="term_id" className="w-full h-10 rounded-[10px] border border-[var(--border)] bg-[var(--surface-1)] px-3 text-[13px] outline-none focus:border-[#1d1d1f]">
                    <option value="">All Terms</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Class</Label>
                <select name="class_id" required className="w-full h-10 rounded-[10px] border border-[var(--border)] bg-[var(--surface-1)] px-3 text-[13px] outline-none focus:border-[#1d1d1f]">
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Start Date</Label>
                  <Input name="start_date" type="date" required />
                </div>
                <div className="space-y-1">
                  <Label>End Date</Label>
                  <Input name="end_date" type="date" required />
                </div>
              </div>
              <button type="submit" disabled={isSubmitting}
                style={{ width: "100%", height: 46, background: "#1d1d1f", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                {isSubmitting ? "Creating…" : "Create Exam"}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Exam Cards Grid ── */}
      {exams.length === 0 ? (
        <div className="apple-card p-16 text-center">
          <div className="w-16 h-16 rounded-[20px] bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4">
            <CalendarDays size={28} className="text-[var(--muted-foreground)]" />
          </div>
          <p className="text-[15px] font-bold text-[var(--foreground)]">No exams yet</p>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-1">Create your first exam to get started.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map(ex => {
            const c = getTypeColor(ex.exam_types?.name);
            const isDeleting = deletingId === ex.id;
            return (
              <div key={ex.id} className="apple-card p-5 flex flex-col gap-4 group relative overflow-hidden">
                {/* Top color bar */}
                <div className={`absolute top-0 left-0 right-0 h-[3px] ${c.dot}`} />

                {/* Header */}
                <div className="flex items-start justify-between gap-2 pt-1">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-[10px] ${c.bg} flex items-center justify-center shrink-0`}>
                      <BookOpen size={16} className={c.text} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-bold text-[var(--foreground)] leading-tight truncate">{ex.name}</h3>
                      <span className={`inline-flex items-center gap-1 mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                        <div className={`w-1 h-1 rounded-full ${c.dot}`} />
                        {ex.exam_types?.name || "—"}
                      </span>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openSubjectConfig(ex)} title="Configure subjects"
                      className="w-8 h-8 rounded-[8px] bg-[var(--surface-2)] hover:bg-[#1d1d1f] hover:text-white flex items-center justify-center transition-colors text-[var(--muted-foreground)]">
                      <Settings2 size={14} />
                    </button>
                    <button onClick={() => handleDeleteExam(ex.id, ex.name)} disabled={isDeleting} title="Delete exam"
                      className="w-8 h-8 rounded-[8px] bg-[#ff3b30]/8 hover:bg-[#ff3b30] flex items-center justify-center transition-colors text-[#ff3b30] hover:text-white disabled:opacity-40">
                      {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 border-t border-[var(--border)] pt-3">
                  {[
                    { icon: GraduationCap, label: "Class",    value: `${ex.classes?.name || "—"} ${ex.classes?.section || ""}` },
                    { icon: BookOpen,      label: "Term",     value: ex.terms?.name || "All Terms" },
                    { icon: Clock,         label: "Duration", value: ex.start_date && ex.end_date ? `${formatDate(ex.start_date)} – ${formatDate(ex.end_date)}` : "—" },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-2">
                      <row.icon size={12} className="text-[var(--muted-foreground)] shrink-0" />
                      <span className="text-[11px] text-[var(--muted-foreground)] w-14 shrink-0">{row.label}</span>
                      <span className="text-[12px] font-semibold text-[var(--foreground)] truncate">{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Configure subjects CTA */}
                <button onClick={() => openSubjectConfig(ex)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-[10px] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors group/btn">
                  <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">Configure subjects</span>
                  <ChevronRight size={13} className="text-[var(--muted-foreground)] group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Subject Config Dialog ── */}
      <Dialog open={isSubjectOpen} onOpenChange={setIsSubjectOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeExam && (
                <span className={`w-2 h-2 rounded-full ${activeExamColor.dot}`} />
              )}
              {activeExam?.name || "Exam Subjects"}
            </DialogTitle>
            <DialogDescription>Configure subject-wise marks and exam dates.</DialogDescription>
          </DialogHeader>

          {/* Add subject form */}
          <form onSubmit={handleAddSubject} className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[var(--surface-2)] rounded-[14px]">
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <Label className="text-[11px]">Subject</Label>
              <select name="subject_id" required className="w-full h-9 rounded-[8px] border border-[var(--border)] bg-[var(--surface-1)] px-2 text-[12px] outline-none focus:border-[#1d1d1f]">
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Max Marks</Label>
              <Input name="max_marks" type="number" defaultValue="100" required className="h-9 text-[12px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Pass Marks</Label>
              <Input name="pass_marks" type="number" defaultValue="35" required className="h-9 text-[12px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Exam Date</Label>
              <Input name="exam_date" type="date" className="h-9 text-[12px]" />
            </div>
            <div className="col-span-2 sm:col-span-4 flex justify-end">
              <button type="submit" disabled={isSubmitting}
                style={{ height: 36, padding: "0 16px", background: "#1d1d1f", color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
                {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                Add Subject
              </button>
            </div>
          </form>

          {/* Subject list */}
          <div className="apple-card overflow-hidden">
            {examSubjects.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-[var(--muted-foreground)]">No subjects added yet.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    {["Subject","Max","Pass","Date",""].map(h => (
                      <th key={h} className="text-left py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {examSubjects.map(sub => (
                    <tr key={sub.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                      <td className="py-3 px-4 text-[13px] font-semibold text-[var(--foreground)]">{sub.subjects?.name}</td>
                      <td className="py-3 px-4 text-[13px] mono-num text-[var(--foreground)]">{sub.max_marks}</td>
                      <td className="py-3 px-4 text-[13px] mono-num text-[var(--foreground)]">{sub.pass_marks}</td>
                      <td className="py-3 px-4 text-[12px] text-[var(--muted-foreground)] mono-num">{sub.exam_date ? formatDate(sub.exam_date) : "—"}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => handleRemoveSubject(sub.id)}
                          className="w-7 h-7 rounded-[6px] text-[#ff3b30] hover:bg-[#ff3b30]/8 flex items-center justify-center transition-colors">
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
