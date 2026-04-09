import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSelect, FormTextarea } from "@/components/ui/form-fields";
import { createExpense } from "./actions";
import { Wallet, FileText, ArrowRight, BookOpen } from "lucide-react";

export default async function AccountingExpensesPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: categories } = await supabase.from("finance_categories").select("id, name, type").order("name");
  const { data: expenses } = await supabase.from("expenses").select("id, title, amount, method, expense_date, notes, created_at, category_id, transaction_id").order("expense_date", { ascending: false });

  type ExpenseTableRow = {
    id: string;
    title: string;
    category: string;
    amountFormatted: string;
    method: string;
    expense_date: string;
    notes: string | null;
    transaction_id: string | null;
    status: string;
    created_at: string;
    submitted_at: string;
  };

  const tableData: ExpenseTableRow[] = (expenses || []).map((expense) => ({
    id: expense.id,
    title: expense.title,
    category: categories?.find((category) => category.id === expense.category_id)?.name || "Uncategorized",
    amountFormatted: `$${Number(expense.amount).toFixed(2)}`,
    method: expense.method,
    expense_date: expense.expense_date,
    notes: expense.notes,
    transaction_id: expense.transaction_id,
    status: expense.transaction_id ? "Posted" : "Pending",
    created_at: expense.created_at,
    submitted_at: expense.created_at,
  }));

  const columns = [
    { header: "Title", accessorKey: "title" as const },
    { header: "Category", accessorKey: "category" as const },
    { header: "Amount", accessorKey: "amountFormatted" as const },
    { header: "Method", accessorKey: "method" as const },
    { header: "Expense Date", accessorKey: "expense_date" as const },
    { header: "Status", accessorKey: "status" as const },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Expense Management</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Record and review operational expenses with category and method tracking.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/accounting/ledger">Ledger view</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/accounting/reports">Reports</a>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="apple-card">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">New Expense</p>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Record a manual expense</h2>
            </div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 dark:bg-zinc-900 dark:bg-zinc-100/10 dark:text-zinc-300">
              <FileText className="h-5 w-5" />
            </div>
          </div>

          <form action={createExpense} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="expense-title" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Title</label>
              <Input id="expense-title" name="title" placeholder="Expense title" required />
            </div>

            <FormSelect
              name="category_id"
              label="Category"
              required
              options={(categories || []).map((category) => ({
                value: category.id,
                label: `${category.name} (${category.type})`,
              }))}
            />

            <div className="space-y-2">
              <label htmlFor="expense-amount" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Amount</label>
              <Input id="expense-amount" name="amount" type="number" step="0.01" placeholder="0.00" required />
            </div>

            <FormSelect
              name="method"
              label="Payment Method"
              required
              options={[
                { value: "cash", label: "Cash" },
                { value: "card", label: "Card" },
                { value: "bank_transfer", label: "Bank Transfer" },
                { value: "online", label: "Online" },
              ]}
            />

            <div className="space-y-2">
              <label htmlFor="expense-date" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Expense Date</label>
              <Input id="expense-date" name="expense_date" type="date" required />
            </div>

            <FormTextarea name="notes" label="Notes" helperText="Optional memo for the expense." />
            <div className="flex justify-end">
              <Button type="submit">Save Expense</Button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="apple-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Expense ledger</p>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Recent expenses</h2>
              </div>
              <div className="inline-flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                <Wallet className="h-5 w-5" />
                <span>{expenses?.length ?? 0} entries</span>
              </div>
            </div>
          </div>

          <DataTable
            data={tableData}
            columns={columns}
            searchKey="title"
            searchPlaceholder="Search expenses..."
            pageSize={8}
            emptyMessage="No expenses recorded yet."
          />
        </div>
      </div>
    </div>
  );
}
