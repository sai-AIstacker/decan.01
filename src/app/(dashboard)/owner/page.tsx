import { redirect } from "next/navigation";
import { getSessionProfile, isOwnerEmail } from "@/lib/auth/profile";
import { createAdminByOwnerAction } from "@/app/actions/owner";

export default async function OwnerPage() {
  const { profile } = await getSessionProfile();
  if (!isOwnerEmail(profile?.email)) {
    redirect("/dashboard");
  }

  async function createAdminFormAction(formData: FormData) {
    "use server";

    await createAdminByOwnerAction({
      email: String(formData.get("email") ?? ""),
      fullName: String(formData.get("fullName") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Owner Console</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create school admin accounts and credentials directly from here.
        </p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">Create Admin Account</h2>
        <form action={createAdminFormAction} className="mt-5 grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="fullName" className="text-sm font-medium">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-200"
              placeholder="School Admin"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-200"
              placeholder="admin@school.com"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Temporary Password
            </label>
            <input
              id="password"
              name="password"
              type="text"
              required
              minLength={8}
              className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-200"
              placeholder="Use a strong password"
            />
          </div>

          <button
            type="submit"
            className="mt-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Create Admin
          </button>
        </form>
      </div>
    </section>
  );
}
