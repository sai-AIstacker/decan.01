"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/profile";

// ─── Fee Invoice Actions ───────────────────────────────────────────────────

export async function createInvoice(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const studentId = String(formData.get("student_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const amount = parseFloat(String(formData.get("amount") ?? "0"));
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!studentId || !title || !amount || !dueDate) {
    return { success: false, error: "All required fields must be filled" };
  }
  if (amount <= 0) return { success: false, error: "Amount must be positive" };

  const { data, error } = await supabase
    .from("invoices")
    .insert({ student_id: studentId, title, amount, due_date: dueDate, status: "pending" })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Create a transaction record for the billed amount
  await supabase.from("transactions").insert({
    type: "income",
    amount,
    description: `Invoice: ${title}`,
    transaction_date: new Date().toISOString(),
    student_id: studentId,
  });

  revalidatePath("/accounting/fee-management");
  revalidatePath("/accounting/receivables");
  revalidatePath("/accounting");
  return { success: true, invoiceId: data.id };
}

export async function markInvoicePaid(invoiceId: string, paymentMethod: string, paidAmount?: number) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const { data: invoice, error: fetchErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (fetchErr || !invoice) return { success: false, error: "Invoice not found" };

  const amount = paidAmount ?? Number(invoice.amount);

  const { error: updateErr } = await supabase
    .from("invoices")
    .update({ status: "paid" })
    .eq("id", invoiceId);

  if (updateErr) return { success: false, error: updateErr.message };

  // Record payment
  await supabase.from("payments").insert({
    invoice_id: invoiceId,
    amount_paid: amount,
    payment_method: paymentMethod,
    payment_date: new Date().toISOString(),
    recorded_by: profile.id,
  });

  // Record transaction
  await supabase.from("transactions").insert({
    type: "income",
    amount,
    description: `Payment received: ${invoice.title}`,
    transaction_date: new Date().toISOString(),
    invoice_id: invoiceId,
    student_id: invoice.student_id,
  });

  revalidatePath("/accounting/fee-management");
  revalidatePath("/accounting/receivables");
  revalidatePath("/accounting");
  return { success: true };
}

export async function bulkMarkOverdue() {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const today = new Date().toISOString().split("T")[0];
  const { error } = await supabase
    .from("invoices")
    .update({ status: "overdue" })
    .eq("status", "pending")
    .lt("due_date", today);

  if (error) return { success: false, error: error.message };

  revalidatePath("/accounting/receivables");
  revalidatePath("/accounting");
  return { success: true };
}

// ─── Payment Actions ───────────────────────────────────────────────────────

export async function createPayment(data: {
  studentId: string;
  amount: number;
  paymentMethod: string;
  description: string;
  invoiceId?: string;
}) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  // Record transaction
  const { error: txnError } = await supabase.from("transactions").insert({
    type: "income",
    amount: data.amount,
    description: data.description,
    transaction_date: new Date().toISOString(),
    student_id: data.studentId,
    invoice_id: data.invoiceId ?? null,
  });

  if (txnError) return { success: false, error: txnError.message };

  if (data.invoiceId) {
    await supabase.from("payments").insert({
      invoice_id: data.invoiceId,
      amount_paid: data.amount,
      payment_method: data.paymentMethod,
      payment_date: new Date().toISOString(),
      recorded_by: profile.id,
    });
    await supabase.from("invoices").update({ status: "paid" }).eq("id", data.invoiceId);
  }

  revalidatePath("/accounting");
  revalidatePath("/accounting/fee-management");
  revalidatePath("/accounting/receivables");
  return { success: true };
}

// ─── Journal Entry Actions ─────────────────────────────────────────────────

export async function createJournalEntry(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const description = String(formData.get("description") ?? "").trim();
  const entryDate = String(formData.get("entry_date") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();
  const linesJson = String(formData.get("lines") ?? "[]");

  if (!description || !entryDate) {
    return { success: false, error: "Description and date are required" };
  }

  let lines: Array<{ account_name: string; account_code: string; entry_type: "debit" | "credit"; amount: number; description?: string }>;
  try {
    lines = JSON.parse(linesJson);
  } catch {
    return { success: false, error: "Invalid journal lines" };
  }

  if (lines.length < 2) return { success: false, error: "At least 2 lines required" };

  const totalDebits = lines.filter((l) => l.entry_type === "debit").reduce((s, l) => s + l.amount, 0);
  const totalCredits = lines.filter((l) => l.entry_type === "credit").reduce((s, l) => s + l.amount, 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    return { success: false, error: `Debits (${totalDebits}) must equal Credits (${totalCredits})` };
  }

  // Insert journal entry header
  const { data: journal, error: journalError } = await supabase
    .from("journal_entries")
    .insert({
      description,
      entry_date: entryDate,
      reference: reference || `JE-${Date.now()}`,
      status: "posted",
      created_by: profile.id,
    })
    .select()
    .single();

  if (journalError || !journal) return { success: false, error: journalError?.message || "Failed to create journal" };

  // Insert journal lines (journal_entry_id after migration 015 rename)
  const { error: linesError } = await supabase.from("journal_entry_lines").insert(
    lines.map((l) => ({
      journal_entry_id: journal.id,
      account_name: l.account_name,
      account_code: l.account_code,
      entry_type: l.entry_type,
      amount: l.amount,
      description: l.description || description,
    }))
  );

  if (linesError) {
    await supabase.from("journal_entries").delete().eq("id", journal.id);
    return { success: false, error: linesError.message };
  }

  // Also record as a transaction for reporting
  await supabase.from("transactions").insert({
    type: totalDebits > 0 ? "expense" : "income",
    amount: totalDebits,
    description,
    transaction_date: new Date(entryDate).toISOString(),
  });

  revalidatePath("/accounting/journals");
  revalidatePath("/accounting/ledger");
  revalidatePath("/accounting");
  return { success: true, journalId: journal.id };
}

// ─── Budget Actions ────────────────────────────────────────────────────────

export async function createBudgetPeriod(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();

  if (!name || !startDate || !endDate) {
    return { success: false, error: "All fields required" };
  }

  // Deactivate existing active periods
  await supabase.from("budget_periods").update({ is_active: false }).eq("is_active", true);

  const { error } = await supabase.from("budget_periods").insert({
    name,
    start_date: startDate,
    end_date: endDate,
    is_active: true,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/accounting/budgets");
  return { success: true };
}

export async function createBudgetItem(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const periodId = String(formData.get("period_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;
  const budgetedAmount = parseFloat(String(formData.get("budgeted_amount") ?? "0"));
  const notes = String(formData.get("notes") ?? "").trim();

  if (!periodId || !name || !budgetedAmount) {
    return { success: false, error: "Period, name, and amount are required" };
  }

  const { error } = await supabase.from("budget_items").insert({
    budget_period_id: periodId,
    name,
    category_id: categoryId,
    budgeted_amount: budgetedAmount,
    notes,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/accounting/budgets");
  return { success: true };
}

// ─── Fixed Asset Actions ───────────────────────────────────────────────────

export async function createFixedAsset(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const purchaseCost = parseFloat(String(formData.get("purchase_cost") ?? "0"));
  const purchaseDate = String(formData.get("purchase_date") ?? "").trim();
  const usefulLifeYears = parseInt(String(formData.get("useful_life_years") ?? "5"));
  const depreciationMethod = String(formData.get("depreciation_method") ?? "straight_line");
  const location = String(formData.get("location") ?? "").trim();
  const vendor = String(formData.get("vendor") ?? "").trim();

  if (!name || !category || !purchaseCost || !purchaseDate) {
    return { success: false, error: "Name, category, cost, and purchase date are required" };
  }

  // Generate asset code
  const prefix = category.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  const assetCode = `${prefix}-${timestamp}`;

  const { error } = await supabase.from("fixed_assets").insert({
    asset_code: assetCode,
    name,
    category,
    purchase_cost: purchaseCost,
    purchase_date: purchaseDate,
    useful_life_years: usefulLifeYears,
    depreciation_method: depreciationMethod,
    accumulated_depreciation: 0,
    // current_book_value is auto-computed by trigger
    status: "active",
    location,
    vendor,
  });

  if (error) return { success: false, error: error.message };

  // Record as expense transaction
  await supabase.from("transactions").insert({
    type: "expense",
    amount: purchaseCost,
    description: `Asset purchase: ${name}`,
    transaction_date: new Date(purchaseDate).toISOString(),
  });

  revalidatePath("/accounting/fixed-assets");
  return { success: true };
}

export async function runDepreciation(assetId: string) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const { data: asset, error: fetchErr } = await supabase
    .from("fixed_assets")
    .select("*")
    .eq("id", assetId)
    .single();

  if (fetchErr || !asset) return { success: false, error: "Asset not found" };

  const cost = Number(asset.purchase_cost);
  const usefulLife = Number(asset.useful_life_years);
  const accumulated = Number(asset.accumulated_depreciation);

  // Straight-line depreciation
  const annualDep = cost / usefulLife;
  const monthlyDep = annualDep / 12;
  const newAccumulated = Math.min(cost, accumulated + monthlyDep);
  const newBookValue = cost - newAccumulated;
  const newStatus = newBookValue <= 0 ? "fully_depreciated" : "active";

  const { error } = await supabase
    .from("fixed_assets")
    .update({
      accumulated_depreciation: newAccumulated,
      // current_book_value is auto-computed by trigger (015 migration)
      status: newStatus,
    })
    .eq("id", assetId);

  if (error) return { success: false, error: error.message };

  // Record depreciation expense
  await supabase.from("transactions").insert({
    type: "expense",
    amount: monthlyDep,
    description: `Depreciation: ${asset.name}`,
    transaction_date: new Date().toISOString(),
  });

  revalidatePath("/accounting/fixed-assets");
  return { success: true, monthlyDepreciation: monthlyDep };
}

// ─── Bank Account Actions ──────────────────────────────────────────────────

export async function createBankAccount(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const name = String(formData.get("name") ?? "").trim();
  const bankName = String(formData.get("bank_name") ?? "").trim();
  const accountNumber = String(formData.get("account_number") ?? "").trim();
  const accountType = String(formData.get("account_type") ?? "savings");
  const openingBalance = parseFloat(String(formData.get("opening_balance") ?? "0"));
  const ifscCode = String(formData.get("ifsc_code") ?? "").trim();

  if (!name || !bankName) {
    return { success: false, error: "Account name and bank name are required" };
  }

  const { error } = await supabase.from("bank_accounts").insert({
    name,
    bank_name: bankName,
    account_number: accountNumber,
    account_type: accountType,
    opening_balance: openingBalance,
    current_balance: openingBalance,
    ifsc_code: ifscCode,
    is_active: true,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/accounting/bank");
  return { success: true };
}

export async function updateBankBalance(accountId: string, newBalance: number, note: string) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const { data: account } = await supabase
    .from("bank_accounts")
    .select("current_balance, name")
    .eq("id", accountId)
    .single();

  if (!account) return { success: false, error: "Account not found" };

  const diff = newBalance - Number(account.current_balance);

  const { error } = await supabase
    .from("bank_accounts")
    .update({ current_balance: newBalance })
    .eq("id", accountId);

  if (error) return { success: false, error: error.message };

  // Record adjustment transaction
  if (diff !== 0) {
    await supabase.from("transactions").insert({
      type: diff > 0 ? "income" : "expense",
      amount: Math.abs(diff),
      description: `Bank balance adjustment: ${account.name} - ${note}`,
      transaction_date: new Date().toISOString(),
    });
  }

  revalidatePath("/accounting/bank");
  return { success: true };
}

// ─── Cost Center Actions ───────────────────────────────────────────────────

export async function createCostCenter(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const parentId = String(formData.get("parent_id") ?? "").trim() || null;

  if (!name || !code) return { success: false, error: "Name and code are required" };

  const { error } = await supabase.from("cost_centers").insert({
    name,
    code,
    description,
    parent_id: parentId,
    is_active: true,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/accounting/cost-centers");
  return { success: true };
}

// ─── Chart of Accounts Actions ─────────────────────────────────────────────

export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const accountCode = String(formData.get("account_code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const accountType = String(formData.get("account_type") ?? "").trim();
  const parentId = String(formData.get("parent_id") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();

  if (!accountCode || !name || !accountType) {
    return { success: false, error: "Account code, name, and type are required" };
  }

  const { error } = await supabase.from("chart_of_accounts").insert({
    account_code: accountCode,
    name,
    account_type: accountType,
    parent_id: parentId,
    description,
    status: "active",
    is_system: false,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/accounting/chart-of-accounts");
  return { success: true };
}

// ─── Finance Category Actions ──────────────────────────────────────────────

export async function createFinanceCategory(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "expense") as "income" | "expense";

  if (!name) return { success: false, error: "Category name is required" };

  const { error } = await supabase.from("finance_categories").insert({ name, type });

  if (error) return { success: false, error: error.message };

  revalidatePath("/accounting");
  return { success: true };
}

// ─── Bank Reconciliation Actions ───────────────────────────────────────────

export async function createReconciliation(formData: FormData) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  const bankAccountId = String(formData.get("bank_account_id") ?? "").trim();
  const periodStart = String(formData.get("period_start") ?? "").trim();
  const periodEnd = String(formData.get("period_end") ?? "").trim();
  const statementBalance = parseFloat(String(formData.get("statement_balance") ?? "0"));

  if (!bankAccountId || !periodStart || !periodEnd) {
    return { success: false, error: "All fields required" };
  }

  // Get current book balance
  const { data: account } = await supabase
    .from("bank_accounts")
    .select("current_balance")
    .eq("id", bankAccountId)
    .single();

  const bookBalance = Number(account?.current_balance ?? 0);
  const difference = statementBalance - bookBalance;

  const { error } = await supabase.from("bank_reconciliations").insert({
    bank_account_id: bankAccountId,
    period_start: periodStart,
    period_end: periodEnd,
    statement_balance: statementBalance,
    book_balance: bookBalance,
    difference,
    status: Math.abs(difference) < 0.01 ? "completed" : "in_progress",
    created_by: profile.id,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/accounting/bank");
  return { success: true, difference };
}
