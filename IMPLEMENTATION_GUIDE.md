# Edge Case Handling Implementation Guide

## Overview

This guide explains how to apply robust edge case handling across the system. All new components and modified existing components should follow these patterns.

---

## 1. Validation Patterns

### Import Validation Utilities

```typescript
import {
  validateRequired,
  validateEmail,
  validateMinLength,
  validateMaxLength,
  validateDateRange,
  validateAlphanumeric,
  getDatabaseErrorMessage,
  getNetworkErrorMessage,
} from "@/lib/validation/form-validators";
```

### Validate Form Fields

```typescript
const validateForm = useCallback((formData: FormData): boolean => {
  const errors: Record<string, string> = {};

  // Validate required field
  const nameValidation = validateRequired(name, "Name");
  if (!nameValidation.isValid) {
    errors.name = nameValidation.error || "Name is required.";
  }

  // Validate minimum length
  const lengthValidation = validateMinLength(name, 3, "Name");
  if (!lengthValidation.isValid) {
    errors.name = lengthValidation.error;
  }

  // Validate alphanumeric
  const codeValidation = validateAlphanumeric(code, "Code");
  if (!codeValidation.isValid) {
    errors.code = codeValidation.error;
  }

  setFieldErrors(errors);
  return Object.keys(errors).length === 0;
}, []);
```

---

## 2. Prevent Duplicate Submissions

### Pattern for Client Components

Always check if a submission is already in progress:

```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = useCallback(async (formData: FormData) => {
  // Guard: Prevent duplicate submissions
  if (isSubmitting) {
    console.warn("Form already submitting, ignoring duplicate request");
    return;
  }

  setIsSubmitting(true);
  
  try {
    // Your operation here
  } finally {
    setIsSubmitting(false);
  }
}, [isSubmitting]);
```

### Disable Buttons During Submission

```typescript
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
  {isSubmitting ? "Saving..." : "Save"}
</Button>
```

---

## 3. Error Handling

### Display Field Errors

```typescript
import { FieldError } from "@/components/ui/form-error";

<div>
  <Label>Field Name</Label>
  <Input className={fieldErrors.fieldName ? "border-red-500" : ""} />
  {fieldErrors.fieldName && <FieldError error={fieldErrors.fieldName} />}
</div>
```

### Display General Errors

```typescript
import { FormError, ValidationErrorsList, ErrorAlert } from "@/components/ui/form-error";

// Single error
{generalError && <FormError error={generalError} />}

// Multiple errors
{Object.keys(fieldErrors).length > 0 && (
  <ValidationErrorsList errors={fieldErrors} />
)}

// Dismissible alert
<ErrorAlert 
  error={error} 
  title="Error" 
  onDismiss={() => setError(null)} 
/>
```

### Handle Database Errors

```typescript
import { getDatabaseErrorMessage } from "@/lib/validation/form-validators";

try {
  const { error } = await supabase.from("table").insert(data);
  if (error) {
    const errorMsg = getDatabaseErrorMessage(error);
    setGeneralError(errorMsg);
    toast.error(errorMsg);
    return;
  }
} catch (e: any) {
  const errorMsg = getDatabaseErrorMessage(e);
  setGeneralError(errorMsg);
}
```

### Handle Network Errors

```typescript
import { getNetworkErrorMessage } from "@/lib/validation/form-validators";

try {
  await fetchData();
} catch (e: any) {
  const errorMsg = getNetworkErrorMessage(e) || "Operation failed";
  toast.error(errorMsg);
}
```

---

## 4. Empty State Handling

### Display Empty States

```typescript
import { EmptyState } from "@/components/ui/empty-state";

{items && items.length === 0 ? (
  <EmptyState
    title="No items yet"
    description="Create your first item to get started."
    actionLabel="Create Item"
    onAction={() => setIsOpen(true)}
  />
) : (
  <Table>
    {/* Content */}
  </Table>
)}
```

### Handle Loading States

```typescript
{isLoading && <PageSkeleton />}
{!isLoading && items.length === 0 && <EmptyState />}
{!isLoading && items.length > 0 && <Table />}
```

---

## 5. Form Component Usage

### FormField Component

```typescript
import { FormField } from "@/components/ui/form-fields";

<FormField
  id="email"
  name="email"
  label="Email"
  type="email"
  placeholder="user@example.com"
  error={fieldErrors.email}
  helperText="We'll never share your email"
  required
/>
```

### FormSelect Component

```typescript
import { FormSelect } from "@/components/ui/form-fields";

<FormSelect
  id="role"
  name="role"
  label="Role"
  error={fieldErrors.role}
  required
  options={[
    { value: "admin", label: "Administrator" },
    { value: "user", label: "User" },
  ]}
/>
```

### FormTextarea Component

```typescript
import { FormTextarea } from "@/components/ui/form-fields";

<FormTextarea
  id="description"
  name="description"
  label="Description"
  error={fieldErrors.description}
  maxLength={500}
  showCharCount
  placeholder="Enter description"
/>
```

---

## 6. Server Actions with Error Handling

### Pattern for Server Actions

```typescript
"use server";

import { getDatabaseErrorMessage } from "@/lib/validation/form-validators";

export async function createRecord(formData: FormData) {
  try {
    // Validate inputs
    const name = String(formData.get("name") ?? "").trim();
    
    if (!name) {
      throw new Error("Name is required.");
    }

    const supabase = await createClient();

    // Execute operation
    const { error } = await supabase.from("table").insert({ name });

    if (error) {
      throw error;
    }

    // Revalidate cache
    revalidatePath("/path");
    
    return { success: true };
  } catch (e: any) {
    const errorMsg = getDatabaseErrorMessage(e) || e.message || "Operation failed";
    console.error("createRecord error:", errorMsg);
    throw new Error(errorMsg);
  }
}
```

---

## 7. Hook Usage for Complex Forms

### useDebouncedSubmit Hook

```typescript
import { useDebouncedSubmit } from "@/hooks/use-debounced-submit";

function MyForm() {
  const { isSubmitting, submit } = useDebouncedSubmit({
    delay: 300,
    onSuccess: () => toast.success("Success!"),
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = async () => {
    await submit(async () => {
      await supabase.from("table").insert(data);
    });
  };

  return <Button onClick={handleSubmit} disabled={isSubmitting}>Submit</Button>;
}
```

### useForm Hook

```typescript
import { useForm } from "@/hooks/use-debounced-submit";

function MyForm() {
  const { values, errors, isSubmitting, getFieldProps, handleSubmit } = useForm({
    initialValues: { name: "", email: "" },
    onSubmit: async (values) => {
      await supabase.from("users").insert(values);
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.name) errors.name = "Name is required";
      return errors;
    },
    onSuccess: () => toast.success("Saved!"),
  });

  return (
    <form onSubmit={handleSubmit}>
      <input {...getFieldProps("name")} />
      {errors.name && <FieldError error={errors.name} />}
    </form>
  );
}
```

---

## 8. Dialog Form Example

Complete example with all patterns:

```typescript
import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-fields";
import { FormError, ValidationErrorsList } from "@/components/ui/form-error";
import { validateRequired, getDatabaseErrorMessage } from "@/lib/validation/form-validators";

export function MyDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validateForm = (formData: FormData): boolean => {
    const errors: Record<string, string> = {};
    const name = (formData.get("name") as string)?.trim();

    const nameValidation = validateRequired(name, "Name");
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error || "Name is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = useCallback(
    async (formData: FormData) => {
      if (isSubmitting) return;

      setGeneralError(null);

      if (!validateForm(formData)) {
        return;
      }

      const name = (formData.get("name") as string).trim();

      setIsSubmitting(true);
      try {
        const { error } = await supabase.from("table").insert({ name });

        if (error) {
          throw error;
        }

        toast.success("Created successfully");
        setIsOpen(false);
        setFieldErrors({});
      } catch (e: any) {
        const errorMsg = getDatabaseErrorMessage(e);
        setGeneralError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting]
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setFieldErrors({});
      setGeneralError(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger>Create</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Record</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          {generalError && <FormError error={generalError} />}
          {Object.keys(fieldErrors).length > 0 && (
            <ValidationErrorsList errors={fieldErrors} />
          )}

          <FormField
            label="Name"
            name="name"
            placeholder="Enter name"
            error={fieldErrors.name}
            required
            disabled={isSubmitting}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 9. Checklist for New Components

- [ ] All inputs have validation before submission
- [ ] Duplicate submissions are prevented (isSubmitting guard)
- [ ] All async operations have try-catch blocks
- [ ] Field errors are displayed with FieldError component
- [ ] General errors use FormError or ErrorAlert components
- [ ] Database errors are converted to user-friendly messages
- [ ] Network errors are handled gracefully
- [ ] Loading states are shown (spinners, disabled buttons)
- [ ] Empty states are displayed when no data exists
- [ ] Buttons are disabled during async operations
- [ ] User gets success/error feedback via toast
- [ ] Form closes on successful submission
- [ ] Form errors are cleared when dialog closes

---

## 10. Error Message Best Practices

### ❌ Bad Error Messages
```
"Error: 23505"
"Failed: undefined is not a function"
"Network error"
```

### ✅ Good Error Messages
```
"This email is already registered. Please try signing in."
"Cannot delete this item because it has related data. Please remove related items first."
"Network connection failed. Please check your internet connection and try again."
```

---

## Files to Reference

- **Validation**: `/src/lib/validation/form-validators.ts`
- **Error Handling**: `/src/lib/error-handling.ts`
- **Components**: `/src/components/ui/form-error.tsx`, `/src/components/ui/form-fields.tsx`
- **Hooks**: `/src/hooks/use-debounced-submit.ts`
- **Examples**: 
  - Academic Years Manager
  - Classes Manager Enhanced
  - Updated form actions

---

## Questions?

Refer to the example implementations in:
- `src/app/(dashboard)/admin/academic-years/ui/academic-years-manager.tsx`
- `src/app/(dashboard)/admin/classes/ui/classes-manager-enhanced.tsx`
