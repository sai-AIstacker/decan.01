import { redirect } from "next/navigation";

export default function AssignmentsPage() {
  // This page is obsolete due to the new academic structure.
  // Assignments are now handled natively via enrollments and class_subjects.
  redirect("/admin/classes");
}
