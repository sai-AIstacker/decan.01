"use client";

type Props = {
  createClass: (formData: FormData) => Promise<void>;
};

export function ClassForm({ createClass }: Props) {
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await createClass(new FormData(event.currentTarget));
      }}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="min-w-[200px] flex-1 space-y-1">
        <label htmlFor="name" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Class name
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="e.g. Algebra I — Period 3"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
      </div>
      <div className="w-full space-y-1 sm:w-32">
        <label htmlFor="grade_level" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Grade
        </label>
        <input
          id="grade_level"
          name="grade_level"
          placeholder="9"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
      </div>
      <div className="w-full space-y-1 sm:w-36">
        <label htmlFor="school_year" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          School year
        </label>
        <input
          id="school_year"
          name="school_year"
          defaultValue="2025-26"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Add class
      </button>
    </form>
  );
}
