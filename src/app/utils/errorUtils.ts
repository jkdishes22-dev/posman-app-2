/**
 * Utility functions for handling API errors with enhanced permission details
 */

export interface ApiErrorResponse {
    message: string;
    missingPermissions?: string[];
    isAdmin?: boolean;
    userRoles?: string[];
    requiredPermissions?: string[];
    networkError?: boolean;
    status?: number;
}

export interface ErrorState {
    error: string | null;
    errorDetails: any;
}

export interface StandardizedError {
    message: string;
    details: any;
}

/**
 * Standardizes API errors into a consistent format
 */
export const standardizeApiError = (error: any, status: number): StandardizedError => {
    if (status === 0) {
        // Network error
        return {
            message: "Network error occurred",
            details: { networkError: true, status: 0 }
        };
    }

    if (status === 401) {
        return {
            message: "Authentication required",
            details: { status: 401, authError: true }
        };
    }

    if (status === 403) {
        return {
            message: error.message || "Access denied",
            details: {
                status: 403,
                missingPermissions: error.missingPermissions,
                isAdmin: error.isAdmin,
                userRoles: error.userRoles,
                requiredPermissions: error.requiredPermissions
            }
        };
    }

    if (status === 404) {
        return {
            message: error.message || "Resource not found",
            details: { status: 404 }
        };
    }

    if (status >= 500) {
        return {
            message: error.message || "Server error occurred",
            details: { status, serverError: true }
        };
    }

    // Generic error
    return {
        message: error.message || error.error || "An error occurred",
        details: { status }
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
