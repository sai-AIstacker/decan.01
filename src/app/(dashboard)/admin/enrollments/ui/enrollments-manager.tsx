"use client";

import { useState } from "react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  createEnrollmentAdminAction,
  deleteEnrollmentAdminAction,
  updateEnrollmentAdminAction,
} from "@/app/actions/enrollments";

type EnrollmentRow = {
  id: string;
  student_id: string;
  class_id: string;
  status: "active" | "transferred" | "graduated";
  profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
  classes: { id: string; name: string; section: string } | { id: string; name: string; section: string }[];
};

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "Unknown error";
}

export default function EnrollmentsManager({
  initialEnrollments,
  availableClasses,
  availableStudents,
  activeYearId
}: {
  initialEnrollments: EnrollmentRow[];
  availableClasses: Array<{ id: string; name: string; section: string }>;
  availableStudents: Array<{ id: string; full_name: string | null; email: string | null }>;
  activeYearId: string | null;
}) {
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<EnrollmentRow | null>(null);
  const router = useRouter();

  useEffect(() => {
    setEnrollments(initialEnrollments);
  }, [initialEnrollments]);

  const handleCreate = async (formData: FormData) => {
    const student_id = formData.get("student_id") as string;
    const class_id = formData.get("class_id") as string;
    const status = formData.get("status") as string;
    
    if (!student_id || !class_id || !activeYearId) {
        toast.warning("Student, class, and active year are required.");
        return;
    }

    try {
      const result = await createEnrollmentAdminAction({
        studentId: student_id,
        classId: class_id,
        academicYearId: activeYearId,
        status: (status as "active" | "transferred" | "graduated") || "active",
      });

      if (result.enrollment) {
        setEnrollments((prev) => {
          const idx = prev.findIndex((e) => e.id === result.enrollment.id);
          if (idx >= 0) {
            const cloned = [...prev];
            cloned[idx] = result.enrollment;
            return cloned;
          }
          return [result.enrollment, ...prev];
        });
      }

      router.refresh();
      setIsOpen(false);
      toast.success(
        result.updatedExisting
          ? "Existing enrollment updated for this academic year."
          : "Student enrolled successfully."
      );
    } catch (e: unknown) {
      toast.error("Enrollment error: " + getErrorMessage(e));
    }
  };

  const handleUpdate = async (formData: FormData) => {
    if(!editingEnrollment) return;
    
    const class_id = formData.get("class_id") as string;
    const status = formData.get("status") as string;
    
    try {
      const result = await updateEnrollmentAdminAction({
        enrollmentId: editingEnrollment.id,
        classId: class_id,
        status: status as "active" | "transferred" | "graduated",
      });
      if (result.enrollment) {
        setEnrollments((prev) => prev.map((e) => (e.id === result.enrollment.id ? result.enrollment : e)));
      }
      router.refresh();
      setIsUpdateOpen(false);
      setEditingEnrollment(null);
    } catch (e: unknown) {
      toast.error("Update error: " + getErrorMessage(e));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this enrollment?")) return;
    try {
      await deleteEnrollmentAdminAction(id);
      router.refresh();
    } catch (e: unknown) {
      toast.error("Delete error: " + getErrorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center p-4 bg-white/50 dark:bg-zinc-900/50 apple-card backdrop-blur-xl shadow-sm">
        <h2 className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">
           View and modify class rosters.
        </h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white rounded-xl px-5 h-10" disabled={!activeYearId || availableClasses.length === 0}>
              <Plus className="w-4 h-4 mr-2" /> Enroll Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enroll Student into Class</DialogTitle>
              <DialogDescription>
                Create a student enrollment for the currently active academic year.
              </DialogDescription>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="student_id">Student</Label>
                <select id="student_id" name="student_id" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1">
                   {availableStudents.map(s => (
                     <option key={s.id} value={s.id} className="dark:bg-zinc-900">{s.full_name || s.email}</option>
                   ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="class_id">Target Class</Label>
                <select id="class_id" name="class_id" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1">
                   {availableClasses.map(c => (
                     <option key={c.id} value={c.id} className="dark:bg-zinc-900">{c.name} {c.section}</option>
                   ))}
                </select>
              </div>

              <div>
                <Label htmlFor="status">Enrollment Status</Label>
                <select id="status" name="status" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1">
                   <option value="active" className="dark:bg-zinc-900">Active</option>
                   <option value="transferred" className="dark:bg-zinc-900">Transferred</option>
                   <option value="graduated" className="dark:bg-zinc-900">Graduated</option>
                </select>
              </div>
              
              <Button type="submit" className="w-full">Enroll Student</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogContent>
          <DialogHeader>
             <DialogTitle>Update Enrollment</DialogTitle>
             <DialogDescription>
               Move the student to a different class or update enrollment status.
             </DialogDescription>
          </DialogHeader>
          {editingEnrollment && (
             <form action={handleUpdate} className="space-y-4">
               <div>
                  <Label>Student</Label>
                  <p className="px-3 py-2 text-sm font-medium border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 bg-zinc-50 dark:bg-zinc-900">
                    {unwrapRelation(editingEnrollment.profiles)?.full_name ||
                      unwrapRelation(editingEnrollment.profiles)?.email}
                  </p>
               </div>
               <div>
                 <Label htmlFor="edit_class_id">Move to Class</Label>
                 <select id="edit_class_id" name="class_id" defaultValue={editingEnrollment.class_id} required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1">
                    {availableClasses.map(c => (
                      <option key={c.id} value={c.id} className="dark:bg-zinc-900">{c.name} {c.section}</option>
                    ))}
                 </select>
               </div>
               <div>
                 <Label htmlFor="edit_status">Update Status</Label>
                 <select id="edit_status" name="status" defaultValue={editingEnrollment.status} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 mt-1">
                    <option value="active" className="dark:bg-zinc-900">Active</option>
                    <option value="transferred" className="dark:bg-zinc-900">Transferred</option>
                    <option value="graduated" className="dark:bg-zinc-900">Graduated</option>
                 </select>
               </div>
               <Button type="submit" className="w-full">Update</Button>
             </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="bg-white dark:bg-black apple-card overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Enrolled Class</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enr) => (
              <TableRow key={enr.id}>
                <TableCell className="font-medium text-foreground">
                  {unwrapRelation(enr.profiles)?.full_name || unwrapRelation(enr.profiles)?.email}
                </TableCell>
                <TableCell className="font-semibold text-primary">
                  {unwrapRelation(enr.classes)?.name} {unwrapRelation(enr.classes)?.section}
                </TableCell>
                <TableCell>
                   <Badge variant={enr.status === 'active' ? 'default' : 'secondary'}>{enr.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                   <div className="flex justify-end space-x-1">
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg" onClick={() => {
                        setEditingEnrollment(enr);
                        setIsUpdateOpen(true);
                     }}>
                        <Edit2 className="w-4 h-4" />
                     </Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg" onClick={() => handleDelete(enr.id)}>
                        <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                </TableCell>
              </TableRow>
            ))}
            {enrollments.length === 0 && (
               <TableRow><TableCell colSpan={4} className="text-center text-zinc-500">No enrollments found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
