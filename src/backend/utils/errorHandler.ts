/**
 * Centralized error handler for API responses
 * Logs technical details to console while returning user-friendly messages
 */

export interface ErrorContext {
  operation?: string; // e.g., "creating", "fetching", "updating", "deleting"
  resource?: string; // e.g., "bill", "inventory", "user"
  customMessage?: string; // Optional custom user-friendly message
}

export interface ErrorResponse {
  userMessage: string;
  errorCode?: string;
}

/**
 * Maps technical error patterns to user-friendly messages
 */
const getErrorMessage = (error: any, context?: ErrorContext): string => {
  const errorMessage = error?.message || String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Inventory-related errors
  if (lowerMessage.includes("insufficient stock") || lowerMessage.includes("not enough inventory")) {
    if (lowerMessage.includes("ingredient") || lowerMessage.includes("composite")) {
      return "Not enough inventory available. The item requires ingredients that are currently out of stock. Please issue more items to inventory before adding to bill.";
    }
    return "Not enough inventory available. Please check stock levels or issue more items to inventory before adding to bill.";
  }

  if (lowerMessage.includes("failed to reserve inventory") || lowerMessage.includes("unable to reserve")) {
    return "Unable to reserve inventory. Please try again or contact support if the problem persists.";
  }

  // Database constraint errors
  if (error?.code === "ER_DUP_ENTRY") {
    if (error?.sqlMessage?.includes("unique_name_idx") || lowerMessage.includes("duplicate")) {
      const resourceName = context?.resource || "item";
      return `This ${resourceName} already exists. Please choose a different name.`;
    }
    return "This record already exists. Please check for duplicates.";
  }

  if (error?.code === "ER_NO_REFERENCED_ROW_2" || lowerMessage.includes("foreign key constraint")) {
    return "Unable to complete this operation. A related record is missing. Please contact support.";
  }

  // Validation errors
  if (lowerMessage.includes("validation") || lowerMessage.includes("invalid")) {
    return "Invalid data provided. Please check your input and try again.";
  }

  // Permission/authorization errors
  if (lowerMessage.includes("permission") || lowerMessage.includes("unauthorized") || lowerMessage.includes("forbidden")) {
    return "You don't have permission to perform this action. Please contact your administrator.";
  }

  // Not found errors
  if (lowerMessage.includes("not found") || lowerMessage.includes("does not exist")) {
    const resource = context?.resource || "item";
    return `The requested ${resource} could not be found.`;
  }

  // Custom message override
  if (context?.customMessage) {
    return context.customMessage;
  }

  // Generic operation-specific messages
  if (context?.operation && context?.resource) {
    const operationMap: Record<string, string> = {
      creating: "create",
      fetching: "retrieve",
      updating: "update",
      deleting: "delete",
      submitting: "submit",
      closing: "close",
      cancelling: "cancel",
      voiding: "void",
      reopening: "reopen",
      resubmitting: "resubmit"
    };

    const action = operationMap[context.operation] || context.operation;
    const resource = context.resource;
    
    return `Unable to ${action} ${resource}. Please try again or contact support if the problem persists.`;
  }

  // Fallback generic message
  return "An error occurred while processing your request. Please try again or contact support if the problem persists.";
};

/**
 * Gets error code for error categorization
 */
const getErrorCode = (error: any): string | undefined => {
  const errorMessage = error?.message || String(error);
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes("insufficient stock")) return "INSUFFICIENT_STOCK";
  if (lowerMessage.includes("failed to reserve inventory")) return "INVENTORY_RESERVATION_FAILED";
  if (error?.code === "ER_DUP_ENTRY") return "DUPLICATE_ENTRY";
  if (error?.code === "ER_NO_REFERENCED_ROW_2") return "FOREIGN_KEY_CONSTRAINT";
  if (lowerMessage.includes("validation")) return "VALIDATION_ERROR";
  if (lowerMessage.includes("permission") || lowerMessage.includes("unauthorized")) return "PERMISSION_ERROR";
  if (lowerMessage.includes("not found")) return "NOT_FOUND";

  return undefined;
};

/**
 * Handles API errors by logging technical details and returning user-friendly messages
 * 
 * @param error - The error object
 * @param context - Optional context about the operation (operation type, resource name)
 * @returns Object with userMessage and optional errorCode
 * 
 * @example
 * ```typescript
 * catch (error: any) {
 *   const { userMessage, errorCode } = handleApiError(error, {
 *     operation: "creating",
 *     resource: "bill"
 *   });
 *   res.status(500).json({ error: userMessage, code: errorCode });
 * }
 * ```
 */
export const handleApiError = (error: any, context?: ErrorContext): ErrorResponse => {
  // Log full error details to console for debugging
  const contextInfo = context 
    ? ` [${context.operation || "operation"} ${context.resource || "resource"}]`
    : "";
  
  console.error(`[Error Handler]${contextInfo}:`, {
    message: error?.message,
    stack: error?.stack,
    name: error?.name,
    code: error?.code,
    sqlMessage: error?.sqlMessage,
    fullError: error
  });

  // Return user-friendly message
  const userMessage = getErrorMessage(error, context);
  const errorCode = getErrorCode(error);

  return {
    userMessage,
    errorCode
  };
};

