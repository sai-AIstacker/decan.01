# Edge Case Handling - Quick Reference

## 🚀 Quick Start

### Import Everything You Need
```typescript
// Validation
import { validateRequired, validateEmail, getDatabaseErrorMessage, getNetworkErrorMessage } from "@/lib/validation/form-validators";

// Error Components
import { FormError, ValidationErrorsList, FieldError } from "@/components/ui/form-error";

// Form Components
import { FormField, FormSelect, FormTextarea } from "@/components/ui/form-fields";

// Hooks
import { useDebouncedSubmit, useForm, useAsync } from "@/hooks/use-debounced-submit";

// Error Utilities
import { isNetworkError, isAuthError, formatErrorMessage } from "@/lib/error-handling";
```

---

## 📝 Common Patterns

### Complete Form Handler
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
const [generalError, setGeneralError] = useState<string | null>(null);

const handleSubmit = async (formData: FormData) => {
  if (isSubmitting) return; // Prevent double-click

  setGeneralError(null);
  setFieldErrors({});

  // Validate
  const name = (formData.get("name") as string)?.trim();
  const errors: Record<string, string> = {};
  
  const nameV = validateRequired(name, "Name");
  if (!nameV.isValid) errors.name = nameV.error || "";
  
  if (Object.keys(errors).length > 0) {
    setFieldErrors(errors);
    return;
  }

  setIsSubmitting(true);
  try {
    const { error } = await supabase.from("table").insert({ name });
    if (error) throw error;
    
    toast.success("Created successfully");
    // Reset or close dialog
  } catch (e: any) {
    const msg = getDatabaseErrorMessage(e) || e.message;
    setGeneralError(msg);
    toast.error(msg);
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## 🔍 Validation Cheatsheet

| Task | Code |
|------|------|
| Check not empty | `validateRequired(value, "Field Name")` |
| Check email | `validateEmail(email)` |
| Check min length | `validateMinLength(value, 3, "Name")` |
| Check max length | `validateMaxLength(value, 100, "Name")` |
| Check alphanumeric | `validateAlphanumeric(code, "Code")` |
| Check date valid | `validateDate(date, "Date")` |
| Check date range | `validateDateRange(start, end)` |
| Check password | `validatePassword(pwd, 8)` |
| Check phone | `validatePhone(phone)` |
| Check URL | `validateUrl(url)` |
| Check number range | `validateNumberRange(num, 1, 10, "Value")` |

All return `{ isValid: boolean, error?: string }`

---

## 🎨 Component Usage

### Show Field Error
```typescript
<div>
  <Label>Email</Label>
  <Input className={fieldErrors.email ? "border-red-500" : ""} />
  {fieldErrors.email && <FieldError error={fieldErrors.email} />}
</div>
```

### Show Multiple Errors
```typescript
{Object.keys(fieldErrors).length > 0 && (
  <ValidationErrorsList errors={fieldErrors} />
)}
```

### Show General Error
```typescript
{generalError && <FormError error={generalError} />}
```

### Dismissible Alert
```typescript
<ErrorAlert 
  error={error} 
  title="Error" 
  onDismiss={() => setError(null)} 
/>
```

---

## 🚫 Error Handling

### Detect Error Type
```typescript
if (isNetworkError(error)) {
  // Handle network error
}
if (isAuthError(error)) {
  // Handle auth error
}
```

### Get User-Friendly Message
```typescript
const msg = formatErrorMessage(error);
// Returns plain English message
```

### Handle Database Error
```typescript
const msg = getDatabaseErrorMessage(error);
// Returns: "This record already exists" instead of "23505"
```

### Handle Network Error
```typescript
const msg = getNetworkErrorMessage(error);
// Returns: "Network connection failed..."
```

---

## ⚙️ Hook Usage

### useDebouncedSubmit
```typescript
const { isSubmitting, submit } = useDebouncedSubmit({
  delay: 300,
  onSuccess: () => toast.success("Saved!"),
  onError: (err) => toast.error(err.message),
});

await submit(async () => {
  await supabase.from("table").insert(data);
});
```

### useForm
```typescript
const { values, errors, isSubmitting, getFieldProps, handleSubmit } = useForm({
  initialValues: { name: "", email: "" },
  onSubmit: async (values) => {
    await api.create(values);
  },
  validate: (values) => {
    const errors: Record<string, string> = {};
    if (!values.name) errors.name = "Name required";
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
```

### useAsync
```typescript
const { data, isLoading, error, execute } = useAsync<User>();

const loadUser = async () => {
  await execute(() => supabase.from("users").select());
};
```

---

## 🎯 Form Component Usage

### FormField
```typescript
<FormField
  label="Email"
  type="email"
  placeholder="user@example.com"
  error={fieldErrors.email}
  helperText="We'll never share your email"
  required
  maxLength={100}
/>
```

### FormSelect
```typescript
<FormSelect
  label="Role"
  error={fieldErrors.role}
  required
  options={[
    { value: "admin", label: "Admin" },
    { value: "user", label: "User" },
  ]}
/>
```

### FormTextarea
```typescript
<FormTextarea
  label="Description"
  error={fieldErrors.description}
  maxLength={500}
  showCharCount
  placeholder="Enter description"
/>
```

---

## 🔐 Security Quick Tips

- Always validate on client AND server
- Always sanitize user input with `sanitizeInput()`
- Never display error codes to users
- Never log sensitive data
- Always use HTTPS
- Always validate FormData in server actions
- Check authorization before database operations

---

## ⚡ Performance Tips

- Use `useDebouncedSubmit` to prevent rapid submissions
- Use `useAsync` for non-blocking operations
- Cache validation results when appropriate
- Batch multiple validations together
- Use `shouldFetch` guards to prevent unnecessary API calls

---

## 🐛 Debugging

### In Development
- Error boundary shows debug info
- Console logs include operation context
- Error messages are descriptive

### Check Error Type
```typescript
console.log("Is network error?", isNetworkError(error));
console.log("Is auth error?", isAuthError(error));
console.log("Is validation error?", isValidationError(error));
```

### Watch for Common Issues
- ❌ Missing validation before submission
- ❌ No `isSubmitting` guard
- ❌ Not showing errors to user
- ❌ No empty state handling
- ❌ No loading indicators
- ❌ Silent failures

---

## 📖 Full Documentation

See detailed guides:
- **IMPLEMENTATION_GUIDE.md** - Complete patterns and examples
- **EDGE_CASE_HANDLING_GUIDE.md** - Pattern code examples
- **EDGE_CASE_HANDLING_SUMMARY.md** - Summary of changes and coverage

Reference implementations:
- **academic-years-manager.tsx** - Uses all patterns
- **classes-manager-enhanced.tsx** - Another full example

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Double submissions | Add `if (isSubmitting) return;` guard |
| Errors not showing | Check `fieldErrors` state is set |
| Validation not working | Ensure validator is called before submit |
| Error message cryptic | Use `getDatabaseErrorMessage()` |
| Network error not detected | Use `isNetworkError(error)` |
| Button not disabling | Add `disabled={isSubmitting}` |
| Form keeps submitting | Check debounce delay or retry logic |
| Empty state not showing | Check array is empty with `items?.length === 0` |
