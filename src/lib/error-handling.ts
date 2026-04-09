/**
 * Error handling utilities for network and system failures
 */

export class ValidationError extends Error {
  constructor(message: string, public fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Wraps async operations with standardized error handling
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  context: string = 'Operation'
): Promise<{ success: boolean; data?: T; error?: Error }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const err = normalizeError(error, context);
    console.error(`[${context}]`, err);
    return { success: false, error: err };
  }
}

/**
 * Normalizes various error types into consistent format
 */
export function normalizeError(error: unknown, context: string = 'Error'): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, any>;
    
    // Handle Supabase errors
    if (errorObj.message) {
      return new Error(errorObj.message);
    }
    
    // Handle API responses
    if (errorObj.error) {
      return new Error(errorObj.error);
    }
  }

  return new Error(`${context}: Unknown error occurred`);
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  
  try {
    return JSON.parse(json) as T;
  } catch {
    console.warn('JSON parse failed, using fallback');
    return fallback;
  }
}

/**
 * Retry async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | null = null;
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = normalizeError(error, `Retry attempt ${attempt}/${maxAttempts}`);
      
      if (attempt < maxAttempts) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        
        // Increase delay for next attempt
        delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
        
        // Add jitter to prevent thundering herd
        delayMs += Math.random() * delayMs * 0.1;
      }
    }
  }

  throw lastError || new Error('Max retry attempts reached');
}

/**
 * Check if error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  const err = error instanceof Error ? error.message : String(error);
  const networkKeywords = [
    'network',
    'fetch',
    'connection',
    'timeout',
    'unreachable',
    'internet',
    'offline',
  ];
  
  return networkKeywords.some((keyword) => err.toLowerCase().includes(keyword));
}

/**
 * Check if error is authentication-related
 */
export function isAuthError(error: unknown): boolean {
  const err = error instanceof Error ? error.message : String(error);
  const authKeywords = [
    'unauthorized',
    '401',
    'forbidden',
    '403',
    'auth',
    'permission',
    'unauthenticated',
  ];
  
  return authKeywords.some((keyword) => err.toLowerCase().includes(keyword));
}

/**
 * Check if error is validation-related
 */
export function isValidationError(error: unknown): boolean {
  return (
    error instanceof ValidationError ||
    (error instanceof Error && error.name === 'ValidationError')
  );
}

/**
 * Format error for display to user
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    return 'Please check your input and try again.';
  }

  if (error instanceof NetworkError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Remove technical details for user display
    const message = error.message;
    
    if (isNetworkError(error)) {
      return 'Network connection failed. Please check your internet connection.';
    }
    
    if (isAuthError(error)) {
      return 'You do not have permission to perform this action.';
    }

    // Return first 100 chars of error message
    return message.substring(0, 100);
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Create abort signal with timeout
 */
export function createTimeoutSignal(timeoutMs: number = 30000): AbortSignal {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  // Clear timeout when signal is used
  controller.signal.addEventListener('abort', () => clearTimeout(timeoutId));
  
  return controller.signal;
}

/**
 * Safely call function with error handling
 */
export function safeCall<T>(
  fn: () => T,
  fallback: T,
  context: string = 'Operation'
): T {
  try {
    return fn();
  } catch (error) {
    console.error(`[${context}]`, error);
    return fallback;
  }
}

/**
 * Validate response has expected data
 */
export function validateResponse<T>(
  response: any,
  expectedKeys: string[]
): { isValid: boolean; error?: string } {
  if (!response) {
    return { isValid: false, error: 'No response received' };
  }

  for (const key of expectedKeys) {
    if (!(key in response)) {
      return { isValid: false, error: `Missing required field: ${key}` };
    }
  }

  return { isValid: true };
}
