/**
 * Hook for preventing duplicate form submissions (prevents double-click)
 * Tracks pending requests and prevents simultaneous submissions
 */

import React, { useCallback, useRef, useState } from 'react';

interface UseDebouncedSubmitOptions {
  delay?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface DebouncedSubmitHandle {
  isSubmitting: boolean;
  isPending: boolean;
  submit: (handler: () => Promise<void>) => Promise<void>;
  reset: () => void;
}

/**
 * useDebouncedSubmit hook
 * Prevents duplicate form submissions and provides debouncing
 * Useful for forms that shouldn't be submitted multiple times
 */
export function useDebouncedSubmit(
  options: UseDebouncedSubmitOptions = {}
): DebouncedSubmitHandle {
  const { delay = 300, onSuccess, onError } = options;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsSubmitting(false);
    setIsPending(false);
  }, []);

  const submit = useCallback(
    async (handler: () => Promise<void>) => {
      // Prevent submission if already submitting or pending
      if (isSubmitting || isPending) {
        console.warn('Submit already in progress, ignoring duplicate request');
        return;
      }

      setIsPending(true);
      
      return new Promise<void>((resolve) => {
        timeoutRef.current = setTimeout(async () => {
          try {
            setIsSubmitting(true);
            
            // Create abort controller for cancellable requests
            abortControllerRef.current = new AbortController();
            
            await handler();
            
            onSuccess?.();
            resolve();
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
            resolve();
          } finally {
            setIsSubmitting(false);
            setIsPending(false);
            timeoutRef.current = null;
          }
        }, delay);
      });
    },
    [isSubmitting, isPending, delay, onSuccess, onError]
  );

  return {
    isSubmitting,
    isPending,
    submit,
    reset,
  };
}

/**
 * Hook for managing async operations with loading and error states
 */
interface UseAsyncOptions<T> {
  initialData?: T;
}

interface UseAsyncReturn<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  execute: (fn: () => Promise<T>) => Promise<T | undefined>;
  reset: () => void;
}

export function useAsync<T>(
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T> {
  const { initialData } = options;
  
  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T | undefined> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fn();
      
      if (isMountedRef.current) {
        setData(result);
        return result;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setIsLoading(false);
    setError(null);
  }, [initialData]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { data, isLoading, error, execute, reset };
}

/**
 * Hook for managing form state with validation
 */
interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void>;
  validate?: (values: T) => Record<string, string>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseFormReturn<T> {
  values: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
  getFieldProps: (fieldName: keyof T) => {
    value: any;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  };
  setFieldValue: (field: keyof T, value: any) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: () => void;
  setErrors: (errors: Record<string, string>) => void;
}

export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const { initialValues, onSubmit, validate, onSuccess, onError } = options;
  
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const initialValuesRef = useRef(initialValues);

  const getFieldProps = useCallback(
    (fieldName: keyof T) => ({
      value: values[fieldName] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setValues((prev) => ({
          ...prev,
          [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
        setIsDirty(true);
        // Clear error for this field on change
        setErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      },
    }),
    [values]
  );

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (isSubmitting) return; // Prevent duplicate submissions

      // Validate if validator exists
      if (validate) {
        const validationErrors = validate(values);
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          return;
        }
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values);
        onSuccess?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setErrors({ submit: err.message });
        onError?.(err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, isSubmitting, validate, onSubmit, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setValues(initialValuesRef.current);
    setErrors({});
    setIsSubmitting(false);
    setIsDirty(false);
  }, []);

  return {
    values,
    errors,
    isSubmitting,
    isDirty,
    getFieldProps,
    setFieldValue,
    handleSubmit,
    reset,
    setErrors,
  };
}
