"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { EmptyState } from "@/components/ui/empty-state";

export default function ClassSubjectsManager({
  initialAssignments,
  availableClasses,
  availableSubjects,
  availableTeachers,
  hasActiveYear,
  activeYearId,
  allowedClassIds,
}: {
  initialAssignments: any[];
  availableClasses: any[];
  availableSubjects: any[];
  availableTeachers: any[];
  hasActiveYear: boolean;
  activeYearId: string | null;
  allowedClassIds: string[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();
  const confirm = useConfirm();

  const handleCreate = async (formData: FormData) => {
    const class_id = formData.get("class_id") as string;
    const subject_id = formData.get("subject_id") as string;
    const teacher_id = formData.get("teacher_id") as string;

    // Guard: lists could be empty if no active year data
    if (!class_id || !subject_id) {
      toast.warning("A class and subject must both be selected.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("class_subjects").insert({
        class_id,
        subject_id,
        teacher_id: teacher_id || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("This subject is already assigned to that class.");
        } else {
          throw error;
        }
        return;
      }

      await refresh();
      router.refresh();
      setIsOpen(false);
      toast.success("Subject assignment saved.");
    } catch (e: any) {
      toast.error("Assignment failed: " + (e.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    const ok = await confirm(`Remove "${label}" from this class?`);
    if (!ok) return;

    setDeletingId(id);
    try {
      const { error } = await supabase.from("class_subjects").delete().eq("id", id);
      if (error) throw error;
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      router.refresh();
      toast.success("Assignment removed.");
    } catch (e: any) {
      toast.error("Delete failed: " + (e.message || "Unknown error"));
    } finally {
      setDeletingId(null);
    }
  };

  const refresh = async () => {
    const query = supabase
      .from("class_subjects")
      .select("*, classes!inner(id, name, section, academic_year_id), subjects!inner(name, code), profiles(full_name, email)")
      .order("created_at", { ascending: false });
    const { data, error } = allowedClassIds.length > 0
      ? await query.in("class_id", allowedClassIds)
      : { data: [], error: null as any };
    if (error) toast.error("Failed to refresh assignments.");
    if (data) setAssignments(data);
  };

  const canCreate = hasActiveYear && availableClasses.length > 0 && availableSubjects.length > 0;
  const missingReasons: string[] = [];
  if (!hasActiveYear) missingReasons.push("No active academic year is set.");
  if (availableClasses.length === 0) missingReasons.push("No classes are available.");
  if (availableSubjects.length === 0) missingReasons.push("No subjects exist yet.");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-white/50 dark:bg-zinc-900/50 apple-card backdrop-blur-xl shadow-sm">
        <p className="text-zinc-600 dark:text-zinc-400 text-sm">
          Manage faculty configurations for the active year classes.
        </p>

        {!hasActiveYear && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> No active academic year set
          </p>
        )}

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5 rounded-xl px-5 h-10 shrink-0"
              disabled={!canCreate}
              title={!canCreate ? "Requires an active year, at least one class, and one subject" : undefined}
            >
              <Plus className="w-4 h-4 mr-2" /> Assign Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Subject to Class</DialogTitle>
              <DialogDescription>
                Allocate a subject and optional teacher to a class for the active year.
              </DialogDescription>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="class_id">Class (Active Year)</Label>
                <select
                  id="class_id"
                  name="class_id"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-indigo-400 focus:ring-2 mt-1"
                >
                  {availableClasses.map((c) => (
                    <option key={c.id} value={c.id} className="dark:bg-zinc-900">
                      {c.name} {c.section}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="subject_id">Subject</Label>
                <select
                  id="subject_id"
                  name="subject_id"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-indigo-400 focus:ring-2 mt-1"
                >
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id} className="dark:bg-zinc-900">
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="teacher_id">Assigned Teacher (optional)</Label>
                <select
                  id="teacher_id"
                  name="teacher_id"
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-indigo-400 focus:ring-2 mt-1"
                >
                  <option value="" className="dark:bg-zinc-900">None</option>
                  {availableTeachers.map((t) => (
                    <option key={t.id} value={t.id} className="dark:bg-zinc-900">
                      {t.full_name || t.email}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Assignment
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!canCreate ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          <p className="font-medium">Assign Subject is currently disabled.</p>
          <p className="mt-1">Fix these first: {missingReasons.join(" ")}</p>
        </div>
      ) : null}

      {assignments.length === 0 ? (
        <EmptyState
          title="No subject assignments yet"
          description="Assign subjects to classes to let teachers track attendance and enter marks."
        />
      ) : (
        <div className="apple-card overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((asgn) => (
                <TableRow key={asgn.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                  <TableCell className="font-medium text-zinc-900 dark:text-zinc-100 dark:text-zinc-300">
                    {asgn.classes?.name} {asgn.classes?.section}
                  </TableCell>
                  <TableCell>{asgn.subjects?.name}</TableCell>
                  <TableCell>
                    {asgn.profiles?.full_name || asgn.profiles?.email || (
                      <span className="text-zinc-400 italic text-sm">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg"
                      disabled={deletingId === asgn.id}
                      onClick={() => handleDelete(asgn.id, asgn.subjects?.name)}
                    >
                      {deletingId === asgn.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
