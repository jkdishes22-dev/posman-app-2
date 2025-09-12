# Error Display System Guide

This guide explains how to use the comprehensive error display system implemented across the application.

## Components

### ErrorDisplay Component
A reusable component for displaying errors with consistent styling and behavior.

**Location:** `src/app/components/ErrorDisplay.tsx`

**Props:**
- `error: string | null` - The error message to display
- `variant?: 'danger' | 'warning' | 'info'` - Error type (default: 'danger')
- `dismissible?: boolean` - Whether the error can be dismissed (default: true)
- `onDismiss?: () => void` - Callback when error is dismissed
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import ErrorDisplay from "../components/ErrorDisplay";

// Basic usage
<ErrorDisplay 
  error={errorMessage} 
  onDismiss={() => setErrorMessage(null)}
/>

// With custom styling
<ErrorDisplay 
  error={warningMessage} 
  variant="warning"
  className="mb-4"
  onDismiss={() => setWarningMessage(null)}
/>
```

### useError Hook
A custom hook for managing error state.

**Location:** `src/app/hooks/useError.ts`

**Usage:**
```tsx
import { useError } from "../hooks/useError";

const MyComponent = () => {
  const { error, setError, clearError, hasError } = useError();
  
  const handleAction = async () => {
    try {
      await someAsyncOperation();
      clearError();
    } catch (err) {
      setError("Operation failed: " + err.message);
    }
  };
  
  return (
    <div>
      <ErrorDisplay error={error} onDismiss={clearError} />
      {/* rest of component */}
    </div>
  );
};
```

## Implementation Patterns

### 1. Basic Error State Management
```tsx
const [error, setError] = useState<string | null>(null);

// Set error
setError("Something went wrong");

// Clear error
setError(null);

// Display error
<ErrorDisplay error={error} onDismiss={() => setError(null)} />
```

### 2. API Error Handling
```tsx
const handleApiCall = async () => {
  try {
    setError(null); // Clear previous errors
    const response = await fetch('/api/endpoint');
    const data = await response.json();
    
    if (response.ok) {
      // Handle success
      setError(null);
    } else if (response.status === 403) {
      setError("Access denied: " + (data.message || "You don't have permission"));
    } else {
      setError(data.message || data.error || "Request failed");
    }
  } catch (err) {
    setError("Network error: " + err.message);
  }
};
```

### 3. Form Validation Errors
```tsx
const handleSubmit = (e) => {
  e.preventDefault();
  
  if (!name || !email) {
    setError("Please fill in all required fields");
    return;
  }
  
  // Proceed with submission
};
```

### 4. Modal Error Display
```tsx
const MyModal = ({ showModal, onClose, error, setError }) => {
  return (
    <Modal show={showModal} onHide={onClose}>
      <Modal.Body>
        <ErrorDisplay 
          error={error} 
          onDismiss={() => setError(null)}
        />
        {/* form content */}
      </Modal.Body>
    </Modal>
  );
};
```

## Updated Pages

The following pages have been updated to use the error display system:

1. **Pricelist Management** (`src/app/admin/menu/pricelist/page.tsx`)
   - Added error display for pricelist creation failures
   - Shows 403 permission errors properly
   - Displays API errors in the modal

2. **Category Management** (`src/app/admin/menu/category/page.tsx`)
   - Added error display for form and fetch errors
   - Improved error message formatting

3. **Production Definitions** (`src/app/admin/production/definitions/page.tsx`)
   - Added error display for item fetching and sub-item operations
   - Shows errors in both main page and modal

4. **Billing Section** (`src/app/shared/BillingSection.tsx`)
   - Added error display for item fetching errors
   - Consistent error handling across the billing interface

5. **Item Creation Modal** (`src/app/admin/menu/category/components/items/items-new.tsx`)
   - Updated to use ErrorDisplay component
   - Better error state management

## Best Practices

### 1. Error State Naming
Use descriptive names for error states:
- `fetchError` - for data fetching errors
- `formError` - for form validation errors
- `addItemError` - for specific operation errors
- `authError` - for authentication errors

### 2. Error Clearing
Always clear errors before new operations:
```tsx
const handleAction = async () => {
  setError(null); // Clear previous errors
  try {
    await performAction();
  } catch (err) {
    setError(err.message);
  }
};
```

### 3. Error Message Formatting
Provide meaningful error messages:
```tsx
// Good
setError("Failed to save item: " + error.message);

// Better
setError(data.message || "Failed to save item. Please try again.");

// Best
setError(response.status === 403 
  ? "Access denied: You don't have permission to perform this action"
  : data.message || "Failed to save item. Please try again."
);
```

### 4. Error Display Placement
Place error displays prominently but not intrusively:
- At the top of forms
- Above relevant content sections
- In modals, at the top of the body

### 5. Error Types
Use appropriate error variants:
- `danger` - for critical errors (default)
- `warning` - for warnings that don't prevent operation
- `info` - for informational messages

## Migration Guide

To migrate existing error handling to the new system:

1. **Replace inline error displays:**
   ```tsx
   // Old
   {error && <div className="alert alert-danger">{error}</div>}
   
   // New
   <ErrorDisplay error={error} onDismiss={() => setError(null)} />
   ```

2. **Update error state types:**
   ```tsx
   // Old
   const [error, setError] = useState("");
   
   // New
   const [error, setError] = useState<string | null>(null);
   ```

3. **Improve error handling in API calls:**
   ```tsx
   // Old
   if (!response.ok) {
     console.error("Failed to fetch data");
   }
   
   // New
   if (!response.ok) {
     const data = await response.json();
     setError(data.message || "Failed to fetch data");
   }
   ```

## Admin Permission Details

For admin users, the error display system provides enhanced permission details when encountering 403 Forbidden errors:

### Features
- **Expandable Details**: Click "Show Permission Details" to see detailed information
- **Role Information**: Shows the user's current roles
- **Missing Permissions**: Lists exactly which permissions are missing
- **Required Permissions**: Shows all permissions needed for the action
- **Admin Tips**: Provides guidance on how to fix permission issues
- **Bootstrap Styling**: Uses only Bootstrap classes for maintainability

### Usage
```tsx
<ErrorDisplay 
  error={error} 
  onDismiss={() => setError(null)}
  errorDetails={{
    missingPermissions: ['can_add_pricelist'],
    isAdmin: true,
    userRoles: ['admin'],
    requiredPermissions: ['can_add_pricelist']
  }}
/>
```

### Backend Integration
The auth middleware automatically includes permission details in 403 responses:
```json
{
  "message": "Forbidden (Missing permissions)",
  "missingPermissions": ["can_add_pricelist"],
  "isAdmin": true,
  "userRoles": ["admin"],
  "requiredPermissions": ["can_add_pricelist"]
}
```

## Benefits

1. **Consistent UI** - All errors look and behave the same
2. **Better UX** - Users can dismiss errors and see clear messages
3. **Developer Experience** - Easy to implement and maintain
4. **Accessibility** - Proper ARIA attributes and keyboard navigation
5. **Type Safety** - TypeScript support for error states
6. **Admin-Friendly** - Detailed permission information for administrators
7. **Self-Service** - Admins can see exactly what permissions are needed

This system ensures that all errors are visible to users instead of being hidden in the console, providing a much better user experience. Admin users get additional context to help them resolve permission issues quickly.
