/**
 * EDGE CASE HANDLING GUIDE
 * 
 * This guide demonstrates best practices for handling edge cases in the application.
 * Use these patterns across all form managers and async operations.
 */

// ==================== VALIDATION PATTERNS ====================

// 1. FORM VALIDATION
import {
  validateRequired,
  validateEmail,
  validateMinLength,
  validateDateRange,
  validateAlphanumeric,
  getDatabaseErrorMessage,
  getNetworkErrorMessage,
} from "@/lib/validation/form-validators";

// Example: Validate form data before submission
function validateAcademicYearForm(formData: FormData): boolean {
  const errors: Record<string, string> = {};
  
  const name = (formData.get("name") as string)?.trim();
  const startDate = formData.get("start_date") as string;
  const endDate = formData.get("end_date") as string;

  // Validate required fields
  const nameV = validateRequired(name, "Year name");
  if (!nameV.isValid) errors.name = nameV.error || "";

  const startV = validateRequired(startDate, "Start date");
  if (!startV.isValid) errors.start_date = startV.error || "";

  const endV = validateRequired(endDate, "End date");
  if (!endV.isValid) errors.end_date = endV.error || "";

  // Validate date range if both dates exist
  if (startDate && endDate) {
    const rangeV = validateDateRange(startDate, endDate);
    if (!rangeV.isValid) errors.end_date = rangeV.error || "";
  }

  setFieldErrors(errors);
  return Object.keys(errors).length === 0;
}

// ==================== DUPLICATE ACTION PREVENTION ====================

// 2. PREVENT DOUBLE-CLICK SUBMISSIONS
let isSubmitting = false;

async function handleFormSubmit(formData: FormData) {
  // Guard: Check if already submitting
  if (isSubmitting) {
    console.warn("Submit already in progress, ignoring duplicate request");
    return;
  }

  isSubmitting = true;
  try {
    // Disable submit button during submission
    const submitBtn = document.querySelector("button[type=submit]");
    if (submitBtn) {
      (submitBtn as HTMLButtonElement).disabled = true;
    }

    // Your async operation here
    const result = await supabase.from("table").insert(data);
    
    if (result.error) {
      throw result.error;
    }

    toast.success("Operation completed successfully");
  } catch (error) {
    const errorMsg = getNetworkErrorMessage(error) || getDatabaseErrorMessage(error);
    toast.error(errorMsg);
  } finally {
    isSubmitting = false;
    const submitBtn = document.querySelector("button[type=submit]");
    if (submitBtn) {
      (submitBtn as HTMLButtonElement).disabled = false;
    }
  }
}

// ==================== NETWORK ERROR HANDLING ====================

// 3. HANDLE NETWORK FAILURES
async function fetchDataWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ==================== EMPTY STATE HANDLING ====================

// 4. GRACEFULLY HANDLE EMPTY STATES
function renderContent(items: any[], isLoading: boolean, error?: Error) {
  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <ErrorAlert error={error.message} title="Failed to load data" />
    );
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        title="No items found"
        description="Create your first item to get started."
        actionLabel="Create Item"
        onAction={() => setIsOpen(true)}
      />
    );
  }

  return (
    <Table>
      {/* Render items */}
    </Table>
  );
}

// ==================== MEANINGFUL ERROR MESSAGES ====================

// 5. PROVIDE MEANINGFUL ERROR MESSAGES
function getErrorMessage(error: any): string {
  // Check for specific error codes
  if (error.code === "23505") {
    return "This record already exists. Please try with different values.";
  }

  if (error.code === "23503") {
    return "Cannot complete operation: related data is missing or invalid.";
  }

  // Check for network errors
  if (error.message.includes("network") || error.message.includes("Failed to fetch")) {
    return "Network connection failed. Please check your internet connection.";
  }

  // Check for auth errors
  if (error.status === 401 || error.status === 403) {
    return "You do not have permission to perform this action.";
  }

  // Return generic message as fallback
  return "An unexpected error occurred. Please try again.";
}

// ==================== FORM STATE MANAGEMENT ====================

// 6. MANAGE FORM STATE PROPERLY
interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  isDirty: boolean;
  isSubmitting: boolean;
  generalError: string | null;
}

function useFormState(initialValues: Record<string, any>) {
  const [state, setState] = useState<FormState>({
    values: initialValues,
    errors: {},
    isDirty: false,
    isSubmitting: false,
    generalError: null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setState((prev) => ({
      ...prev,
      values: { ...prev.values, [name]: value },
      isDirty: true,
      // Clear error for this field
      errors: { ...prev.errors, [name]: undefined },
    }));
  };

  return { state, setState, handleChange };
}

// ==================== COMPONENT ERROR BOUNDARY ====================

// 7. USE ERROR BOUNDARY FOR COMPONENTS
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WrappedComponent(props: P) {
    const [error, setError] = useState<Error | null>(null);

    if (error) {
      return (
        fallback || (
          <ErrorAlert
            error={error.message}
            title="Component Error"
            onDismiss={() => setError(null)}
          />
        )
      );
    }

    return (
      <ErrorBoundary onError={setError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// ==================== INPUT SANITIZATION ====================

// 8. SANITIZE USER INPUT
import { sanitizeInput } from "@/lib/validation/form-validators";

function processUserInput(input: string): string {
  // Remove dangerous characters and limit length
  const sanitized = sanitizeInput(input);
  return sanitized;
}

// ==================== LOADING STATES ====================

// 9. MANAGE LOADING STATES FOR ASYNC OPERATIONS
interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

async function fetchWithLoadingState<T>(
  operation: () => Promise<T>,
  setState: (state: AsyncState<T>) => void
) {
  setState({ data: null, isLoading: true, error: null });

  try {
    const data = await operation();
    setState({ data, isLoading: false, error: null });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    setState({ data: null, isLoading: false, error: err });
  }
}

// ==================== FORM SUBMISSION WITH ALL PATTERNS ====================

// 10. COMPLETE EXAMPLE: Form submission with all edge case handling
async function handleCreateWithAllPatterns(formData: FormData) {
  // Prevent duplicate submissions
  if (isSubmitting) {
    console.warn("Submit already in progress");
    return;
  }

  // Clear previous errors
  setGeneralError(null);
  setFieldErrors({});

  // Validate form
  if (!validateForm(formData)) {
    return;
  }

  // Extract and sanitize input
  const name = sanitizeInput(formData.get("name") as string);
  const email = sanitizeInput(formData.get("email") as string);

  setIsSubmitting(true);

  try {
    // Optional: Retry with backoff for network resilience
    const result = await retryWithBackoff(
      () => supabase.from("users").insert({ name, email }),
      { maxAttempts: 3 }
    );

    if (result.error) {
      const errorMsg = getDatabaseErrorMessage(result.error);
      setGeneralError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Success
    toast.success("Record created successfully");
    await refresh();
    setIsOpen(false);
  } catch (error) {
    // Handle network errors or retries exhausted
    const errorMsg = getNetworkErrorMessage(error) || "Failed to create record";
    setGeneralError(errorMsg);
    toast.error(errorMsg);
  } finally {
    setIsSubmitting(false);
  }
}

export {};
