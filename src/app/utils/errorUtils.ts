/**
 * Utility functions for handling API errors with enhanced permission details
 */

export interface ApiErrorResponse {
    message: string;
    missingPermissions?: string[];
    isAdmin?: boolean;
    userRoles?: string[];
    requiredPermissions?: string[];
    status?: number;
    networkError?: boolean;
    isLoginError?: boolean;
}

export interface StandardizedError {
    message: string;
    details: ApiErrorResponse | null;
}

export interface ErrorState {
    error: string | null;
    errorDetails: any;
}

/**
 * Standardizes API error responses into a consistent format
 */
export const standardizeApiError = (error: any, status?: number): StandardizedError => {
    // Handle network errors
    if (status === 500 || !error) {
        return {
            message: "Network error occurred. Please check your connection.",
            details: {
                message: "Network error occurred. Please check your connection.",
                status: 0,
                networkError: true
            }
        };
    }

    // Handle string errors (from apiUtils)
    if (typeof error === 'string') {
        return {
            message: error,
            details: {
                message: error,
                status: status || 500
            }
        };
    }

    // Handle structured error responses
    if (typeof error === 'object' && error.message) {
        return {
            message: error.message,
            details: {
                message: error.message,
                missingPermissions: error.missingPermissions,
                isAdmin: error.isAdmin,
                userRoles: error.userRoles,
                requiredPermissions: error.requiredPermissions,
                status: status || 500
            }
        };
    }

    // Fallback for unknown error formats
    return {
        message: "An unexpected error occurred",
        details: {
            message: "An unexpected error occurred",
            status: status || 500
        }
    };
};

/**
 * Extracts error information from an API response
 */
export const extractErrorInfo = (response: Response, data: any): ErrorState => {
    if (response.status === 403 && data.missingPermissions) {
        return {
            error: data.message || "Access denied: Missing permissions",
            errorDetails: {
                missingPermissions: data.missingPermissions,
                isAdmin: data.isAdmin,
                userRoles: data.userRoles,
                requiredPermissions: data.requiredPermissions
            }
        };
    }

    return {
        error: data.message || data.error || "An error occurred",
        errorDetails: null
    };
};

/**
 * Handles API errors and sets appropriate error states
 */
export const handleApiError = (
    error: any,
    setError: (error: string | null) => void,
    setErrorDetails: (details: any) => void
) => {
    console.error("API Error:", error);
    setError("Network error: " + error.message);
    setErrorDetails(null);
};

/**
 * Clears error states
 */
export const clearErrors = (
    setError: (error: string | null) => void,
    setErrorDetails: (details: any) => void
) => {
    setError(null);
    setErrorDetails(null);
};

/**
 * Creates a standard error handler for API calls
 */
export const createApiErrorHandler = (
    setError: (error: string | null) => void,
    setErrorDetails: (details: any) => void
) => {
    return {
        handleSuccess: () => {
            clearErrors(setError, setErrorDetails);
        },
        handleError: (response: Response, data: any) => {
            const errorInfo = extractErrorInfo(response, data);
            setError(errorInfo.error);
            setErrorDetails(errorInfo.errorDetails);
        },
        handleNetworkError: (error: any) => {
            handleApiError(error, setError, setErrorDetails);
        },
        clear: () => {
            clearErrors(setError, setErrorDetails);
        }
    };
};
