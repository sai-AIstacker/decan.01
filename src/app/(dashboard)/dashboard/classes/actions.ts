"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateRequired, validateMinLength, getDatabaseErrorMessage } from "@/lib/validation/form-validators";

/**
 * Create a new class with validation and error handling
 */
export async function createClass(formData: FormData) {
  try {
    // Extract and trim inputs
    const name = String(formData.get("name") ?? "").trim();
    const gradeLevel = String(formData.get("grade_level") ?? "").trim();
    const schoolYear = String(formData.get("school_year") ?? "").trim() || "2025-26";

    // Validate required fields
    const nameValidation = validateRequired(name, "Class name");
    if (!nameValidation.isValid) {
      throw new Error(nameValidation.error || "Class name is required.");
    }

    const nameLength = validateMinLength(name, 2, "Class name");
    if (!nameLength.isValid) {
      throw new Error(nameLength.error || "Class name must be at least 2 characters.");
    }

    // Validate grade level if provided
    if (gradeLevel && gradeLevel.length > 50) {
      throw new Error("Grade level must not exceed 50 characters.");
    }

    // Validate school year format
    if (!/^\d{4}-\d{2}$/.test(schoolYear)) {
      throw new Error('School year must be in format YYYY-YY (e.g., 2025-26).');
    }

    const supabase = await createClient();

    const { error } = await supabase.from("classes").insert({
      name,
      grade_level: gradeLevel || null,
      school_year: schoolYear,
    });

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard/classes");
    return { success: true, message: "Class created successfully." };
  } catch (e: any) {
    const errorMsg = getDatabaseErrorMessage(e) || e.message || "Failed to create class.";
    console.error("createClass error:", errorMsg);
    throw new Error(errorMsg);
  }
}
