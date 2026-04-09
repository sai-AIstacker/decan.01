import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/ui/data-table";
import { ExportCSVButton } from "@/components/ui/export-csv-button";
import Link from "next/link";

interface LedgerSearchParams {
  student_id?: string;
}

export default async function AccountingLedgerPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, type, amount, description, transaction_date, invoice_id, student_id, category_id")
    .order("transaction_date", { ascending: true });

  const studentIds = Array.from(new Set((transactions || []).map((item) => item.student_id).filter(Boolean) as string[]));
  const students = studentIds.length > 0
    ? (await supabase.from("profiles").select("id, full_name").in("id", studentIds).order("full_name")).data || []
    : [];

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedStudentId = resolvedSearchParams?.student_id;
  const filteredTransactions = selectedStudentId
    ? (transactions || []).filter((row) => row.student_id === selectedStudentId)
    : transactions || [];

  const filteredTransactionIds = filteredTransactions.map((row) => row.id);
  const ledgerEntries = filteredTransactionIds.length > 0
    ? (await supabase
        .from("ledger_entries")
        .select("id, transaction_id, entry_type, account_name, amount, description, created_at")
        .in("transaction_id", filteredTransactionIds)
        .order("created_at", { ascending: true })).data || []
    : [];

  const transactionMap = new Map((filteredTransactions || []).map((tx) => [tx.id, tx]));

  let runningBalance = 0;
  const ledgerRows = (ledgerEntries || []).map((entry) => {
    const transaction = transactionMap.get(entry.transaction_id);
    const debit = entry.entry_type === "debit" ? Number(entry.amount) : 0;
    const credit = entry.entry_type === "credit" ? Number(entry.amount) : 0;
    runningBalance += debit - credit;
    return {
      date: entry.created_at?.substring(0, 10) ?? "",
      description: entry.description,
      account_name: entry.account_name,
      type: entry.entry_type,
      debit,
      credit,
      runningBalance,
      transactionType: transaction?.type || "",
    };
  });

  type LedgerRow = {
    date: string;
    description: string;
    account_name: string;
    type: string;
    debit: number;
    credit: number;
    runningBalance: number;
    debitFormatted: string;
    creditFormatted: string;
    balanceFormatted: string;
    transactionType: string;
  };

  const tableData: LedgerRow[] = ledgerRows.map((row) => {
    const debit = Number(row.debit);
    const credit = Number(row.credit);
    const balance = Number(row.runningBalance);
    return {
      ...row,
      runningBalance: balance,
      type: row.type === "debit" ? "Debit" : "Credit",
      debitFormatted: debit ? `$${debit.toFixed(2)}` : "-",
      creditFormatted: credit ? `$${credit.toFixed(2)}` : "-",
      balanceFormatted: `$${balance.toFixed(2)}`,
    };
  });

  const columns = [
    { header: "Date", accessorKey: "date" as const },
    { header: "Account", accessorKey: "account_name" as const },
    { header: "Description", accessorKey: "description" as const },
    { header: "Debit", accessorKey: "debitFormatted" as const },
    { header: "Credit", accessorKey: "creditFormatted" as const },
    { header: "Balance", accessorKey: "balanceFormatted" as const },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">General Ledger</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">View debit/credit entries with running balance across student and operational transactions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/accounting/expenses" className="inline-flex items-center rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-700 transition hover:border-indigo-400 dark:border-zinc-800 dark:text-zinc-200">
              Record Expense
            </Link>
            <Link href="/accounting/reports" className="inline-flex items-center rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-700 transition hover:border-indigo-400 dark:border-zinc-800 dark:text-zinc-200">
              Run Reports
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="apple-card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Filter Ledger</p>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Student ledger filter</h2>
              </div>
              <form className="grid w-full gap-3 sm:w-auto sm:grid-flow-col" method="get">
                <select name="student_id" defaultValue={selectedStudentId || ""} className="min-w-[220px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                  <option value="">All students</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>{student.full_name}</option>
                  ))}
                </select>
                <button type="submit" className="rounded-xl bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:hover:bg-zinc-200">Apply</button>
              </form>
            </div>
          </div>

          <div className="apple-card">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Running entries</p>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Ledger entries</h2>
              </div>
              <ExportCSVButton
                data={tableData}
                headers={[
                  { key: "date", label: "Date" },
                  { key: "account_name", label: "Account" },
                  { key: "description", label: "Description" },
                  { key: "debit", label: "Debit" },
                  { key: "credit", label: "Credit" },
                  { key: "runningBalance", label: "Balance" },
                ]}
                fileName="ledger-export.csv"
              />
            </div>
            <DataTable
              data={tableData}
              columns={columns}
              searchKey="description"
              searchPlaceholder="Search ledger records..."
              pageSize={10}
              emptyMessage="No ledger entries matched your filter."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
