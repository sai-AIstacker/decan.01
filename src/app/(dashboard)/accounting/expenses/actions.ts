"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateRequired, validateNumberRange, validateDate, getDatabaseErrorMessage } from "@/lib/validation/form-validators";

export async function createExpense(formData: FormData) {
  try {
    const title = String(formData.get("title") ?? "").trim();
    const categoryId = String(formData.get("category_id") ?? "").trim();
    const amountValue = String(formData.get("amount") ?? "").trim();
    const method = String(formData.get("method") ?? "").trim() as string;
    const expenseDate = String(formData.get("expense_date") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    const titleValidation = validateRequired(title, "Expense title");
    if (!titleValidation.isValid) throw new Error(titleValidation.error);

    const categoryValidation = validateRequired(categoryId, "Category");
    if (!categoryValidation.isValid) throw new Error(categoryValidation.error);

    const amount = parseFloat(amountValue);
    const amountValidation = validateNumberRange(amount, 0.01, 10000000, "Amount");
    if (!amountValidation.isValid) throw new Error(amountValidation.error);

    const dateValidation = validateDate(expenseDate, "Expense date");
    if (!dateValidation.isValid) throw new Error(dateValidation.error);

    if (!method) {
      throw new Error("Payment method is required.");
    }

    const supabase = await createClient();
    const { error } = await supabase.from("expenses").insert({
      title,
      category_id: categoryId,
      amount,
      method,
      expense_date: expenseDate,
      notes: notes || null,
    });

    if (error) {
      throw error;
    }

    revalidatePath("/accounting/expenses");
    redirect("/accounting/expenses");
  } catch (error: any) {
    const message = getDatabaseErrorMessage(error) || error?.message || "Unable to record expense.";
    throw new Error(message);
  }
}
