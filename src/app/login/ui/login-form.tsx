"use client";

import { useActionState, useState } from "react";
import { authenticate, type AuthFormState } from "../actions";
import { useFormStatus } from "react-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-[52px] rounded-full bg-[#0a0a0a] dark:bg-white text-white dark:text-[#0a0a0a] text-[15px] font-semibold tracking-tight flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:opacity-80"
    >
      {pending ? <Loader2 size={17} className="animate-spin" /> : "Sign In"}
    </button>
  );
}

export function LoginForm() {
  const initialState: AuthFormState = { error: null };
  const [state, formAction] = useActionState(authenticate, initialState);
  const [showPw, setShowPw] = useState(false);

  return (
    <form action={formAction} className="space-y-5">

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-[11px] font-semibold tracking-widest uppercase text-[var(--muted-foreground)]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@school.edu"
          className="w-full h-[50px] rounded-[12px] border border-[#d2d2d7] dark:border-[#38383a] bg-white dark:bg-[#2c2c2e] px-4 text-[15px] text-[var(--foreground)] placeholder:text-[#aeaeb2] outline-none transition-all focus:border-[#0a0a0a] dark:focus:border-white focus:ring-0"
        />
        {state.fieldErrors?.email && (
          <p className="text-[12px] text-[#ff3b30] font-medium">{state.fieldErrors.email}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-[11px] font-semibold tracking-widest uppercase text-[var(--muted-foreground)]">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={6}
            placeholder="••••••••"
            className="w-full h-[50px] rounded-[12px] border border-[#d2d2d7] dark:border-[#38383a] bg-white dark:bg-[#2c2c2e] px-4 pr-11 text-[15px] text-[var(--foreground)] placeholder:text-[#aeaeb2] outline-none transition-all focus:border-[#0a0a0a] dark:focus:border-white focus:ring-0"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#aeaeb2] hover:text-[var(--foreground)] transition-colors"
          >
            {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {state.fieldErrors?.password && (
          <p className="text-[12px] text-[#ff3b30] font-medium">{state.fieldErrors.password}</p>
        )}
      </div>

      {/* Error */}
      {state.error && (
        <div className="rounded-[12px] bg-[#fff2f2] dark:bg-[#ff3b30]/10 border border-[#ff3b30]/20 px-4 py-3 text-[13px] text-[#ff3b30] font-medium">
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
