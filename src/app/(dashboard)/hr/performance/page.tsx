import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Star, ChevronRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { CreateReviewForm } from "./ui/create-review-form";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-600"}`} />
      ))}
      <span className="ml-1 text-sm font-medium text-slate-700 dark:text-slate-300">{rating.toFixed(1)}</span>
    </div>
  );
}

export default async function PerformancePage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "hr") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [{ data: reviews }, { data: staffRoles }] = await Promise.all([
    supabase
      .from("performance_reviews")
      .select("*, profiles:staff_id(full_name, email), reviewer:reviewer_id(full_name)")
      .order("review_date", { ascending: false }),
    supabase.from("roles").select("id, name").in("name", ["teacher", "admin", "accounting", "hr"]),
  ]);

  const staffRoleIds = (staffRoles || []).map((r) => r.id);
  const { data: userRolesData } = await supabase.from("user_roles").select("user_id").in("role_id", staffRoleIds);
  const staffIds = [...new Set((userRolesData || []).map((ur) => ur.user_id))];
  const { data: allStaff } = await supabase.from("profiles").select("id, full_name, email").in("id", staffIds).order("full_name");

  const allReviews = (reviews || []) as any[];
  const avgRating = allReviews.length > 0
    ? allReviews.reduce((s, r) => s + Number(r.overall_rating || 0), 0) / allReviews.length
    : 0;

  const ratingDist = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: allReviews.filter((rev) => Math.round(Number(rev.overall_rating)) === r).length,
  }));

  const statusConfig: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    submitted: "bg-blue-100 text-zinc-900 dark:bg-zinc-800 dark:text-blue-300",
    acknowledged: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/hr" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">HR</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Performance Reviews</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                <Star className="w-5 h-5 text-white" />
              </div>
              Performance Reviews
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Staff appraisals and performance tracking</p>
          </div>
          <CreateReviewForm staffList={allStaff || []} />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Reviews", value: allReviews.length, color: "text-zinc-900 dark:text-zinc-100 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-zinc-800 dark:bg-indigo-950/30", border: "border-zinc-200/60" },
          { label: "Avg Rating", value: avgRating > 0 ? `${avgRating.toFixed(1)}/5` : "—", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200/60" },
          { label: "Submitted", value: allReviews.filter((r) => r.status === "submitted").length, color: "text-zinc-900 dark:text-zinc-100 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-blue-950/30", border: "border-zinc-200/60" },
          { label: "Acknowledged", value: allReviews.filter((r) => r.status === "acknowledged").length, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200/60" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border ${kpi.border} ${kpi.bg} p-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Rating Distribution */}
      {allReviews.length > 0 && (
        <div className="apple-card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Rating Distribution</h2>
          <div className="space-y-2">
            {ratingDist.map(({ rating, count }) => {
              const pct = allReviews.length > 0 ? Math.round((count / allReviews.length) * 100) : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex gap-0.5 w-24 flex-shrink-0">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-600"}`} />
                    ))}
                  </div>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div className="h-2.5 rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400 w-12 text-right">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">All Reviews</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{allReviews.length} reviews</p>
        </div>
        {allReviews.length === 0 ? (
          <div className="p-12 text-center">
            <Star className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No reviews yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">Create the first performance review using the button above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {allReviews.map((review: any) => (
              <div key={review.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{review.profiles?.full_name || "—"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Period: {review.review_period} · Date: {review.review_date} · By: {review.reviewer?.full_name || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {review.overall_rating && <StarRating rating={Number(review.overall_rating)} />}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusConfig[review.status] || ""}`}>
                      {review.status}
                    </span>
                  </div>
                </div>
                {(review.strengths || review.areas_for_improvement) && (
                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    {review.strengths && (
                      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">Strengths</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">{review.strengths}</p>
                      </div>
                    )}
                    {review.areas_for_improvement && (
                      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">Areas for Improvement</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">{review.areas_for_improvement}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
