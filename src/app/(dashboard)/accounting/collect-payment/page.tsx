import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaymentCollection } from "../payment-collection";
import { CreditCard } from "lucide-react";

export default async function CollectPaymentPage() {
  const { profile } = await getSessionProfile();

  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch students for payment collection
  const { data: students } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl apple-card p-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                  Collect Student Payment
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mt-2">
                  Record student payments through various payment methods. Add transactions to the ledger and track financial records.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Collection Form */}
        <PaymentCollection students={students || []} />
      </div>
    </div>
  );
}
