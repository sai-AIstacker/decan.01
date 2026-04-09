/**
 * Double-Entry Accounting Engine
 * Core accounting logic for the school management system
 */

import { createClient } from "@/lib/supabase/server";

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type EntryType = "debit" | "credit";
export type TransactionStatus = "draft" | "posted" | "void";

export interface JournalEntry {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface Transaction {
  id?: string;
  date: Date;
  description: string;
  reference?: string;
  entries: JournalEntry[];
  status: TransactionStatus;
  createdBy: string;
  metadata?: Record<string, any>;
}

/**
 * Validates that debits equal credits (fundamental accounting equation)
 */
export function validateTransaction(transaction: Transaction): { valid: boolean; error?: string } {
  if (transaction.entries.length < 2) {
    return { valid: false, error: "Transaction must have at least 2 entries" };
  }

  const totalDebits = transaction.entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredits = transaction.entries.reduce((sum, entry) => sum + entry.credit, 0);

  // Allow for small floating point differences
  const difference = Math.abs(totalDebits - totalCredits);
  if (difference > 0.01) {
    return { 
      valid: false, 
      error: `Debits (${totalDebits}) must equal Credits (${totalCredits}). Difference: ${difference}` 
    };
  }

  // Validate each entry has either debit or credit, not both
  for (const entry of transaction.entries) {
    if (entry.debit > 0 && entry.credit > 0) {
      return { valid: false, error: "Entry cannot have both debit and credit" };
    }
    if (entry.debit === 0 && entry.credit === 0) {
      return { valid: false, error: "Entry must have either debit or credit" };
    }
  }

  return { valid: true };
}

/**
 * Posts a transaction to the general ledger
 */
export async function postTransaction(transaction: Transaction): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const validation = validateTransaction(transaction);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const supabase = await createClient();

  try {
    // Insert transaction header
    const { data: txn, error: txnError } = await supabase
      .from("accounting_transactions")
      .insert({
        transaction_date: transaction.date.toISOString(),
        description: transaction.description,
        reference: transaction.reference,
        status: transaction.status,
        created_by: transaction.createdBy,
        metadata: transaction.metadata,
      })
      .select()
      .single();

    if (txnError || !txn) {
      return { success: false, error: txnError?.message || "Failed to create transaction" };
    }

    // Insert journal entries into double_entry_lines
    const entries = transaction.entries.map(entry => ({
      transaction_id: txn.id,
      account_id: entry.accountId || null,
      account_code: entry.accountCode,
      account_name: entry.accountName,
      debit: entry.debit,
      credit: entry.credit,
      description: entry.description || transaction.description,
    }));

    const { error: entriesError } = await supabase
      .from("double_entry_lines")
      .insert(entries);

    if (entriesError) {
      // Rollback transaction
      await supabase.from("accounting_transactions").delete().eq("id", txn.id);
      return { success: false, error: entriesError.message };
    }

    return { success: true, transactionId: txn.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Common transaction templates for school operations
 */
export const TransactionTemplates = {
  /**
   * Student fee payment (Cash/Bank)
   */
  studentFeePayment: (
    studentId: string,
    amount: number,
    paymentMethod: "cash" | "bank" | "card" | "online",
    description: string,
    userId: string
  ): Transaction => {
    const accountMap = {
      cash: { code: "1010", name: "Cash on Hand" },
      bank: { code: "1020", name: "Bank Account" },
      card: { code: "1020", name: "Bank Account" },
      online: { code: "1020", name: "Bank Account" },
    };

    const account = accountMap[paymentMethod];

    return {
      date: new Date(),
      description,
      reference: `FEE-${studentId}`,
      status: "posted",
      createdBy: userId,
      metadata: { studentId, paymentMethod, type: "fee_payment" },
      entries: [
        {
          accountId: "", // Will be resolved from code
          accountCode: account.code,
          accountName: account.name,
          debit: amount,
          credit: 0,
          description: `Fee payment from student`,
        },
        {
          accountId: "",
          accountCode: "4010",
          accountName: "Tuition Fee Revenue",
          debit: 0,
          credit: amount,
          description: `Fee revenue`,
        },
      ],
    };
  },

  /**
   * Expense payment
   */
  expensePayment: (
    categoryId: string,
    categoryName: string,
    amount: number,
    paymentMethod: "cash" | "bank",
    description: string,
    userId: string
  ): Transaction => {
    const accountMap = {
      cash: { code: "1010", name: "Cash on Hand" },
      bank: { code: "1020", name: "Bank Account" },
    };

    const account = accountMap[paymentMethod];

    return {
      date: new Date(),
      description,
      reference: `EXP-${Date.now()}`,
      status: "posted",
      createdBy: userId,
      metadata: { categoryId, paymentMethod, type: "expense" },
      entries: [
        {
          accountId: "",
          accountCode: "5000",
          accountName: categoryName,
          debit: amount,
          credit: 0,
          description,
        },
        {
          accountId: "",
          accountCode: account.code,
          accountName: account.name,
          debit: 0,
          credit: amount,
          description: `Payment via ${paymentMethod}`,
        },
      ],
    };
  },

  /**
   * Salary payment
   */
  salaryPayment: (
    employeeId: string,
    employeeName: string,
    grossSalary: number,
    deductions: number,
    netSalary: number,
    userId: string
  ): Transaction => {
    return {
      date: new Date(),
      description: `Salary payment - ${employeeName}`,
      reference: `SAL-${employeeId}`,
      status: "posted",
      createdBy: userId,
      metadata: { employeeId, type: "salary" },
      entries: [
        {
          accountId: "",
          accountCode: "5100",
          accountName: "Salary Expense",
          debit: grossSalary,
          credit: 0,
        },
        {
          accountId: "",
          accountCode: "2010",
          accountName: "Salary Payable",
          debit: 0,
          credit: grossSalary,
        },
        {
          accountId: "",
          accountCode: "2010",
          accountName: "Salary Payable",
          debit: netSalary,
          credit: 0,
        },
        {
          accountId: "",
          accountCode: "2020",
          accountName: "Tax Payable",
          debit: deductions,
          credit: 0,
        },
        {
          accountId: "",
          accountCode: "1020",
          accountName: "Bank Account",
          debit: 0,
          credit: netSalary,
        },
      ],
    };
  },
};

/**
 * Calculate account balance
 */
export async function getAccountBalance(
  accountId: string,
  asOfDate?: Date
): Promise<{ balance: number; debitTotal: number; creditTotal: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("double_entry_lines")
    .select("debit, credit")
    .eq("account_id", accountId);

  if (asOfDate) {
    query = query.lte("created_at", asOfDate.toISOString());
  }

  const { data: entries } = await query;

  const debitTotal = (entries || []).reduce((sum, e) => sum + Number(e.debit), 0);
  const creditTotal = (entries || []).reduce((sum, e) => sum + Number(e.credit), 0);

  // Balance depends on account type (normal balance)
  // Assets & Expenses: Debit balance (debit - credit)
  // Liabilities, Equity, Revenue: Credit balance (credit - debit)
  const balance = debitTotal - creditTotal;

  return { balance, debitTotal, creditTotal };
}

/**
 * Get trial balance (all accounts with balances)
 */
export async function getTrialBalance(asOfDate?: Date) {
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("status", "active")
    .order("account_code");

  if (!accounts) return [];

  const balances = await Promise.all(
    accounts.map(async (account) => {
      const { balance, debitTotal, creditTotal } = await getAccountBalance(account.id, asOfDate);
      return {
        ...account,
        debitTotal,
        creditTotal,
        balance,
      };
    })
  );

  return balances;
}
