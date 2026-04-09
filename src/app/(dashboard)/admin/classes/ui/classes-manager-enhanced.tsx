"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { FormError, ValidationErrorsList } from "@/components/ui/form-error";
import {
  validateRequired,
  validateMinLength,
  getDatabaseErrorMessage,
  getNetworkErrorMessage,
} from "@/lib/validation/form-validators";

export default function ClassesManagerEnhanced({
  initialClasses,
  activeYears,
  teachers,
}: {
  initialClasses: any[];
  activeYears: any[];
  teachers: any[];
}) {
  const [classesList, setClassesList] = useState(initialClasses);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const supabase = createClient();
  const confirm = useConfirm();

  // Check if there's an active academic year
  const hasActiveYear = activeYears && activeYears.length > 0;
  const academicYearId = activeYears?.[0]?.id;

  const validateForm = useCallback((formData: FormData): boolean => {
    const errors: Record<string, string> = {};
    const name = (formData.get("name") as string)?.trim();
    const section = (formData.get("section") as string)?.trim();

    // Validate name
    const nameReq = validateRequired(name, "Class name");
    if (!nameReq.isValid) {
      errors.name = nameReq.error || "Class name is required.";
    } else {
      const nameLen = validateMinLength(name, 2, "Class name");
      if (!nameLen.isValid) {
        errors.name = nameLen.error || "Class name must be at least 2 characters.";
      }
    }

    // Validate section
    const sectionReq = validateRequired(section, "Section");
    if (!sectionReq.isValid) {
      errors.section = sectionReq.error || "Section is required.";
    } else if (section.length > 50) {
      errors.section = "Section name must not exceed 50 characters.";
    }

    const teacherId = (formData.get("teacher_id") as string)?.trim();
    if (!teacherId) {
      errors.teacher_id = "Please select a class teacher.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, []);

  // Prevent duplicate submissions
  const handleCreate = useCallback(
    async (formData: FormData) => {
      if (isSubmitting) {
        console.warn("Form already submitting, ignoring duplicate request");
        return;
      }

      setGeneralError(null);

      // Check for active academic year first
      if (!hasActiveYear) {
        const msg = "No active academic year found. Please activate one in Academic Years first.";
        setGeneralError(msg);
        toast.error(msg);
        return;
      }

      // Validate form
      if (!validateForm(formData)) {
        return;
      }

      const name = (formData.get("name") as string).trim();
      const section = (formData.get("section") as string).trim();
      const classTeacherId = (formData.get("teacher_id") as string)?.trim();

      const payload = {
        name,
        section,
        academic_year_id: academicYearId,
        class_teacher_id: classTeacherId || null,
      };

      console.log("Creating class payload:", payload);

      setIsSubmitting(true);

      try {
        const { data, error } = await supabase
          .from("classes")
          .insert(payload)
          .select("id, name, section, academic_year_id, class_teacher_id");

        console.log("Create class response:", { data, error });

        if (error) {
          const errorMsg = getDatabaseErrorMessage(error) || error.message || "Failed to create class.";
          setGeneralError(errorMsg);
          toast.error(errorMsg);
          return;
        }

        if (data?.length) {
          setClassesList((prev) => [data[0], ...prev]);
        }

        await refresh();
        setIsOpen(false);
        setFieldErrors({});
        toast.success(`Class "${name}" created successfully.`);
      } catch (e: any) {
        const errorMsg = getNetworkErrorMessage(e) || e.message || "Failed to create class.";
        setGeneralError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, hasActiveYear, academicYearId, validateForm, supabase]
  );

  // Prevent duplicate deletion requests
  const handleDelete = useCallback(
    async (id: string, name: string) => {
      const ok = await confirm(
        `Delete class "${name}"? This cannot be undone and may affect enrollments.`
      );
      if (!ok) return;

      // Prevent duplicate delete requests
      if (deletingId) {
        console.warn("Delete already in progress");
        return;
      }

      setDeletingId(id);
      setGeneralError(null);

      try {
        const { error } = await supabase.from("classes").delete().eq("id", id);

        if (error) {
          const errorMsg = getDatabaseErrorMessage(error);
          toast.error(errorMsg);
          return;
        }

        setClassesList((prev) => prev.filter((c) => c.id !== id));
        toast.success(`Class "${name}" deleted successfully.`);
      } catch (e: any) {
        const errorMsg = getNetworkErrorMessage(e) || "Delete failed. Please try again.";
        toast.error(errorMsg);
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, confirm, supabase]
  );

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      if (data) {
        setClassesList(data);
      }
    } catch (e: any) {
      const errorMsg = getNetworkErrorMessage(e) || "Failed to refresh classes.";
      console.error("Refresh error:", errorMsg);
      toast.error(errorMsg);
    }
  }, [supabase]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setFieldErrors({});
      setGeneralError(null);
    }
  };

  const hasClasses = classesList && classesList.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-end p-4 bg-white/50 dark:bg-zinc-900/50 apple-card backdrop-blur-xl shadow-sm">
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button
              className="bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white rounded-xl px-5 h-10"
              disabled={isSubmitting || !hasActiveYear}
            >
              <Plus className="w-4 h-4 mr-2" /> Create Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Class</DialogTitle>
              <DialogDescription>
                Create a class for the active academic year and assign a class teacher.
              </DialogDescription>
            </DialogHeader>

            {/* Display warning if no active year */}
            {!hasActiveYear && (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>No active academic year. Please activate one first.</p>
              </div>
            )}

            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                await handleCreate(formData);
              }}
              className="space-y-4"
            >
              {/* General error message */}
              {generalError && <FormError error={generalError} />}

              {/* Validation errors */}
              {Object.keys(fieldErrors).length > 0 && (
                <ValidationErrorsList errors={fieldErrors} />
              )}

              <div className="space-y-2">
                <Label htmlFor="name">
                  Class Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="e.g. Grade 10-A"
                  disabled={isSubmitting}
                  className={fieldErrors.name ? "border-red-500" : ""}
                  maxLength={100}
                  aria-invalid={!!fieldErrors.name}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-500">{fieldErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="section">
                  Section <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="section"
                  name="section"
                  required
                  placeholder="e.g. A, B, or Morning"
                  disabled={isSubmitting}
                  className={fieldErrors.section ? "border-red-500" : ""}
                  maxLength={50}
                  aria-invalid={!!fieldErrors.section}
                />
                {fieldErrors.section && (
                  <p className="text-xs text-red-500">{fieldErrors.section}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacher_id">
                  Class Teacher <span className="text-red-500">*</span>
                </Label>
                <select
                  id="teacher_id"
                  name="teacher_id"
                  disabled={isSubmitting}
                  className={`flex h-10 w-full rounded-md px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${fieldErrors.teacher_id ? "border-red-500" : "border-input"}`}
                >
                  <option value="">Select a teacher</option>
                  {teachers?.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </option>
                  ))}
                </select>
                {fieldErrors.teacher_id && (
                  <p className="text-xs text-red-500">{fieldErrors.teacher_id}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || !hasActiveYear}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSubmitting ? "Creating..." : "Create Class"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content: Table or Empty State */}
      {!hasClasses ? (
        <EmptyState
          icon={AlertCircle}
          title="No classes yet"
          description="Create classes to organize students and manage academic activities."
          action={
            <Button type="button" onClick={() => setIsOpen(true)} disabled={!hasActiveYear}>
              Create Class
            </Button>
          }
        />
      ) : (
        <div className="apple-card overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead>Class Name</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Class Teacher</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classesList.map((cls) => (
                <TableRow
                  key={cls.id}
                  className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors"
                >
                  <TableCell className="font-semibold">{cls.name}</TableCell>
                  <TableCell>{cls.section}</TableCell>
                  <TableCell>
                    {cls.class_teacher_id
                      ? teachers?.find((t) => t.id === cls.class_teacher_id)?.full_name || "Unknown"
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {activeYears?.find((y) => y.id === cls.academic_year_id)?.name || "Inactive Year"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg"
                      disabled={deletingId === cls.id}
                      onClick={() => handleDelete(cls.id, cls.name)}
                      aria-label={`Delete ${cls.name}`}
                    >
                      {deletingId === cls.id ? (
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
