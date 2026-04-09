/**
 * Form validation utilities for robust edge case handling
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates required field (non-empty string after trim)
 */
export function validateRequired(value: any, fieldName: string = 'Field'): { isValid: boolean; error?: string } {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  return { isValid: true };
}

/**
 * Validates minimum length
 */
export function validateMinLength(
  value: string,
  minLength: number,
  fieldName: string = 'Field'
): { isValid: boolean; error?: string } {
  const trimmed = value?.trim() || '';
  if (trimmed.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters.`,
    };
  }
  return { isValid: true };
}

/**
 * Validates maximum length
 */
export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName: string = 'Field'
): { isValid: boolean; error?: string } {
  const trimmed = value?.trim() || '';
  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must not exceed ${maxLength} characters.`,
    };
  }
  return { isValid: true };
}

/**
 * Validates alphanumeric with hyphens/underscores
 */
export function validateAlphanumeric(
  value: string,
  fieldName: string = 'Field'
): { isValid: boolean; error?: string } {
  if (!/^[A-Z0-9\-_]+$/i.test(value)) {
    return {
      isValid: false,
      error: `${fieldName} must contain only letters, numbers, hyphens, or underscores.`,
    };
  }
  return { isValid: true };
}

/**
 * Validates date format (YYYY-MM-DD)
 */
export function validateDate(
  value: string,
  fieldName: string = 'Date'
): { isValid: boolean; error?: string } {
  if (!value) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: `${fieldName} must be a valid date.` };
  }
  return { isValid: true };
}

/**
 * Validates date range (end date after start date)
 */
export function validateDateRange(
  startDate: string,
  endDate: string,
  startFieldName: string = 'Start date',
  endFieldName: string = 'End date'
): { isValid: boolean; error?: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Both dates must be valid.' };
  }

  if (end <= start) {
    return {
      isValid: false,
      error: `${endFieldName} must be after ${startFieldName}.`,
    };
  }
  return { isValid: true };
}

/**
 * Validates password strength
 */
export function validatePassword(
  password: string,
  minLength: number = 8
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password) {
    return { isValid: false, errors: ['Password is required.'] };
  }

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long.`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number.');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates phone number format
 */
export function validatePhone(
  phone: string
): { isValid: boolean; error?: string } {
  if (!phone) return { isValid: true }; // Phone is optional
  
  // Removes common formatting characters
  const cleaned = phone.replace(/[\s\-().+]/g, '');
  
  if (!/^[0-9]{7,15}$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Phone number must be 7-15 digits.',
    };
  }
  return { isValid: true };
}

/**
 * Validates number is within range
 */
export function validateNumberRange(
  value: number | string,
  min: number,
  max: number,
  fieldName: string = 'Value'
): { isValid: boolean; error?: string } {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;

  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number.` };
  }

  if (num < min || num > max) {
    return {
      isValid: false,
      error: `${fieldName} must be between ${min} and ${max}.`,
    };
  }
  return { isValid: true };
}

/**
 * Validates URL format
 */
export function validateUrl(
  url: string
): { isValid: boolean; error?: string } {
  if (!url) return { isValid: true }; // URL is optional
  
  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format.' };
  }
}

/**
 * Generic field validation combining multiple validators
 */
export function validateField(
  value: any,
  validators: Array<() => { isValid: boolean; error?: string }>
): { isValid: boolean; error?: string } {
  for (const validator of validators) {
    const result = validator();
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true };
}

/**
 * Get error message for network failure
 */
export function getNetworkErrorMessage(error: any): string {
  if (error?.message?.includes('NetworkError') || error?.message?.includes('Failed to fetch')) {
    return 'Network connection failed. Please check your internet connection.';
  }
  if (error?.status === 408 || error?.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  if (error?.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get user-friendly error message from database error
 */
export function getDatabaseErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred.';

  // Unique constraint violation
  if (error.code === '23505' || error.message?.includes('unique')) {
    return 'This record already exists. Please try with different values.';
  }

  // Foreign key constraint
  if (error.code === '23503' || error.message?.includes('foreign key')) {
    return 'Cannot complete operation: related data is missing or invalid.';
  }

  // Not null violation
  if (error.code === '23502' || error.message?.includes('not-null')) {
    return 'Some required fields are missing.';
  }

  return error.message || 'Database operation failed. Please try again.';
}

/**
 * Validates FormData contains required fields
 */
export function validateFormData(
  formData: FormData,
  requiredFields: string[]
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const field of requiredFields) {
    const value = formData.get(field);
    const trimmed = typeof value === 'string' ? value.trim() : '';
    
    if (!trimmed) {
      errors[field] = `${field} is required.`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sanitize string input to prevent basic injection attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
}
