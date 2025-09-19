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
