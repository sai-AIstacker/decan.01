"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { FieldError } from "@/components/ui/form-error";

/**
 * FormField Component
 * Wrapper for form inputs with label, validation error, and helper text
 */
interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      icon,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const reactId = React.useId();
    const fieldId = id || `field-${reactId}`;

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={fieldId}
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={fieldId}
            className={cn(
              "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
              error
                ? "border-red-500 focus-visible:ring-red-500 dark:border-red-400"
                : "border-input focus-visible:ring-ring",
              icon && "pl-10",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
            {...props}
          />
        </div>

        {error && <FieldError error={error} id={`${fieldId}-error`} />}
        {helperText && !error && (
          <p
            id={`${fieldId}-helper`}
            className="text-xs text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";

/**
 * FormSelect Component
 * Select input with validation support
 */
interface FormSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      id,
      options,
      className,
      ...props
    },
    ref
  ) => {
    const reactId = React.useId();
    const fieldId = id || `select-${reactId}`;

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={fieldId}
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <select
          ref={ref}
          id={fieldId}
          className={cn(
            "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            error
              ? "border-red-500 focus-visible:ring-red-500 dark:border-red-400"
              : "border-input focus-visible:ring-ring",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
          {...props}
        >
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {error && <FieldError error={error} id={`${fieldId}-error`} />}
        {helperText && !error && (
          <p
            id={`${fieldId}-helper`}
            className="text-xs text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = "FormSelect";

/**
 * FormTextarea Component
 * Textarea input with validation support
 */
interface FormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
}

export const FormTextarea = React.forwardRef<
  HTMLTextAreaElement,
  FormTextareaProps
>(
  (
    {
      label,
      error,
      helperText,
      required,
      id,
      maxLength,
      showCharCount,
      value,
      className,
      ...props
    },
    ref
  ) => {
    const reactId = React.useId();
    const fieldId = id || `textarea-${reactId}`;
    const charCount = typeof value === "string" ? value.length : 0;

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={fieldId}
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={fieldId}
          value={value}
          maxLength={maxLength}
          className={cn(
            "flex min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-none",
            error
              ? "border-red-500 focus-visible:ring-red-500 dark:border-red-400"
              : "border-input focus-visible:ring-ring",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
          {...props}
        />

        <div className="flex items-end justify-between gap-2">
          <div className="flex-1">
            {error && <FieldError error={error} id={`${fieldId}-error`} />}
            {helperText && !error && (
              <p
                id={`${fieldId}-helper`}
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                {helperText}
              </p>
            )}
          </div>
          {showCharCount && maxLength && (
            <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

FormTextarea.displayName = "FormTextarea";
