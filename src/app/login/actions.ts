"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateEmail } from "@/lib/validation/form-validators";

export type AuthFormState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

export async function authenticate(
  prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (!email) fieldErrors.email = "Email is required.";
  else if (!validateEmail(email)) fieldErrors.email = "Please enter a valid email address.";
  if (!password) fieldErrors.password = "Password is required.";

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please check your input and try again.", fieldErrors };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        return { error: "Invalid email or password. Please try again." };
      }
      if (error.message.includes("Email not confirmed")) {
        return { error: "Please confirm your email before signing in." };
      }
      return { error: error.message || "Sign in failed. Please try again." };
    }

    redirect("/dashboard");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "An unexpected error occurred.";
    // redirect() throws internally — let it propagate
    if (msg === "NEXT_REDIRECT") throw e;
    return { error: msg };
  }
}
