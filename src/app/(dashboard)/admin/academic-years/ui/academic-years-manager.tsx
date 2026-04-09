"use client";

import { useState, useCallback } from "react";
import {
  activateAcademicYearAdminAction,
  createAcademicYearAdminAction,
} from "@/app/actions/academic-years";
import type { AcademicYear } from "@/types/database";
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
import { Plus, CheckCircle, Circle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { FormError, ValidationErrorsList } from "@/components/ui/form-error";
import { 
  validateRequired, 
  validateDateRange, 
  getDatabaseErrorMessage,
  getNetworkErrorMessage 
} from "@/lib/validation/form-validators";
import { useRouter } from "next/navigation";

export default function AcademicYearsManager({
  initialYears,
}: {
  initialYears: AcademicYear[];
}) {
  const [years, setYears] = useState(initialYears);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const router = useRouter();

  const validateForm = useCallback((formData: FormData): boolean => {
    const name = (formData.get("name") as string)?.trim();
    const start_date = formData.get("start_date") as string;
    const end_date = formData.get("end_date") as string;

    const errors: Record<string, string> = {};

    // Validate name
    const nameValidation = validateRequired(name, "Year name");
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error || "Year name is required.";
    }

    // Validate start date
    const startValidation = validateRequired(start_date, "Start date");
    if (!startValidation.isValid) {
      errors.start_date = startValidation.error || "Start date is required.";
    }

    // Validate end date
    const endValidation = validateRequired(end_date, "End date");
    if (!endValidation.isValid) {
      errors.end_date = endValidation.error || "End date is required.";
    }

    // Validate date range if both dates exist
    if (start_date && end_date) {
      const rangeValidation = validateDateRange(start_date, end_date, "Start date", "End date");
      if (!rangeValidation.isValid) {
        errors.end_date = rangeValidation.error || "End date must be after start date.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, []);

  // Prevent duplicate submissions
  const handleCreate = useCallback(async (formData: FormData) => {
    if (isSubmitting) {
      console.warn("Form already submitting, ignoring duplicate request");
      return;
    }

    setGeneralError(null);

    // Validate form
    if (!validateForm(formData)) {
      return;
    }

    const name = (formData.get("name") as string).trim();
    const start_date = formData.get("start_date") as string;
    const end_date = formData.get("end_date") as string;

    setIsSubmitting(true);
    try {
      const created = await createAcademicYearAdminAction({
        name,
        startDate: start_date,
        endDate: end_date,
      });

      if (created?.id) {
        setYears((prev) => [created, ...prev]);
      }

      router.refresh();
      setIsOpen(false);
      setFieldErrors({});
      toast.success(`Academic year "${name}" created successfully.`);
    } catch (e: any) {
      const errorMsg = getNetworkErrorMessage(e) || e.message || "Failed to create academic year.";
      setGeneralError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, validateForm, router]);

  const handleActivate = useCallback(async (id: string, name: string) => {
    // Prevent duplicate activation requests
    if (activatingId) {
      console.warn("Activation already in progress, ignoring duplicate request");
      return;
    }

    setGeneralError(null);
    setActivatingId(id);

    try {
      await activateAcademicYearAdminAction(id);
      router.refresh();
      toast.success(`"${name}" is now the active academic year.`);
    } catch (e: any) {
      const errorMsg = getNetworkErrorMessage(e) || getDatabaseErrorMessage(e) || "Activation failed.";
      setGeneralError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setActivatingId(null);
    }
  }, [activatingId, router]);

  // Handle dialog close to reset errors
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setFieldErrors({});
      setGeneralError(null);
    }
  };

  const hasYears = years && years.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end p-4 bg-white/50 dark:bg-zinc-900/50 apple-card backdrop-blur-xl shadow-sm">
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white rounded-xl px-5 h-10"
              disabled={isSubmitting}>
              <Plus className="w-4 h-4 mr-2" /> Create Academic Year
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Academic Year</DialogTitle>
              <DialogDescription>
                Create an academic year and activate it when ready.
              </DialogDescription>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              {/* General error message */}
              {generalError && (
                <FormError error={generalError} />
              )}

              {/* Validation errors */}
              {Object.keys(fieldErrors).length > 0 && (
                <ValidationErrorsList errors={fieldErrors} />
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Name (e.g. 2025-2026) <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="2025-2026"
                  disabled={isSubmitting}
                  className={fieldErrors.name ? "border-red-500" : ""}
                  maxLength={100}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-500">{fieldErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date <span className="text-red-500">*</span></Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    required
                    disabled={isSubmitting}
                    className={fieldErrors.start_date ? "border-red-500" : ""}
                  />
                  {fieldErrors.start_date && (
                    <p className="text-xs text-red-500">{fieldErrors.start_date}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date <span className="text-red-500">*</span></Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    required
                    disabled={isSubmitting}
                    className={fieldErrors.end_date ? "border-red-500" : ""}
                  />
                  {fieldErrors.end_date && (
                    <p className="text-xs text-red-500">{fieldErrors.end_date}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSubmitting ? "Creating..." : "Create Academic Year"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table or empty state */}
      {hasYears ? (
        <div className="bg-white dark:bg-black apple-card overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead>Year Name</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Active Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((yr) => (
                <TableRow
                  key={yr.id}
                  className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors"
                >
                  <TableCell className="font-medium">{yr.name}</TableCell>
                  <TableCell>{new Date(yr.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(yr.end_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {yr.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                        <CheckCircle className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-50 text-zinc-600 ring-1 ring-inset ring-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-400 dark:ring-zinc-500/20">
                        <Circle className="w-3.5 h-3.5" /> Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!yr.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activatingId === yr.id || isSubmitting}
                        onClick={() => handleActivate(yr.id, yr.name)}
                      >
                        {activatingId === yr.id && (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        )}
                        Set Active
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={AlertCircle}
          title="No Academic Years"
          description="Create your first academic year to get started."
          action={
            <Button type="button" onClick={() => setIsOpen(true)}>
              Create Academic Year
            </Button>
          }
        />
      )}
    </div>
  );
}
