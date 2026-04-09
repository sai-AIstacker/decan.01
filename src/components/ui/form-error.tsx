"use client";

import React from "react";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * FormError Component
 * Displays form validation errors in a styled container
 */
interface FormErrorProps {
  error?: string | null;
  className?: string;
}

export function FormError({ error, className }: FormErrorProps) {
  if (!error) return null;

  return (
    <div
      className={cn(
        "inline-flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400",
        className
      )}
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{error}</span>
    </div>
  );
}

/**
 * FieldError Component
 * Displays error for a specific form field
 */
interface FieldErrorProps {
  error?: string | null;
  id?: string;
}

export function FieldError({ error, id }: FieldErrorProps) {
  if (!error) return null;

  return (
    <p
      id={id}
      className="mt-1 text-xs font-medium text-red-600 dark:text-red-400"
      role="alert"
    >
      {error}
    </p>
  );
}

/**
 * ErrorAlert Component
 * Dismissible alert for displaying errors
 */
interface ErrorAlertProps {
  error?: string | null;
  onDismiss?: () => void;
  title?: string;
  className?: string;
}

export function ErrorAlert({
  error,
  onDismiss,
  title = "Error",
  className,
}: ErrorAlertProps) {
  const [isVisible, setIsVisible] = React.useState(!!error);

  React.useEffect(() => {
    setIsVisible(!!error);
  }, [error]);

  if (!isVisible || !error) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/5",
        className
      )}
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
      <div className="flex-1">
        <h3 className="font-semibold text-red-900 dark:text-red-300">{title}</h3>
        <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
      </div>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * ValidationErrorsList Component
 * Displays multiple validation errors
 */
interface ValidationErrorsListProps {
  errors: Record<string, string>;
  title?: string;
  className?: string;
}

export function ValidationErrorsList({
  errors,
  title = "Please fix the following errors:",
  className,
}: ValidationErrorsListProps) {
  const errorEntries = Object.entries(errors);

  if (errorEntries.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/5",
        className
      )}
      role="alert"
    >
      <h3 className="font-semibold text-red-900 dark:text-red-300">{title}</h3>
      <ul className="mt-3 space-y-2">
        {errorEntries.map(([field, error]) => (
          <li
            key={field}
            className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400"
          >
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600 dark:bg-red-400" />
            <span>
              <strong>{field}:</strong> {error}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * SuccessMessage Component
 * Displays success feedback
 */
interface SuccessMessageProps {
  message?: string | null;
  className?: string;
}

export function SuccessMessage({ message, className }: SuccessMessageProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "inline-flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600 dark:bg-green-500/10 dark:text-green-400",
        className
      )}
      role="status"
    >
      <span>✓</span>
      <span>{message}</span>
    </div>
  );
}
