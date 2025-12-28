import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { standardizeApiError, StandardizedError } from "./errorUtils";

export interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    errorDetails?: any;
    status: number;
}

export const createApiCall = (logout: () => void, getUser?: () => any) => {
    return async <T = any>(
        url: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> => {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(url, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    ...options.headers,
                },
            });

            const data = await response.json();

            // Handle 401 (Unauthorized) - Never logout, just show error
            if (response.status === 401) {
                // Check if this is a login request (no token means it's a login attempt)
                const token = localStorage.getItem("token");
                const isLoginRequest = !token || url.includes("/api/auth/login");

                if (isLoginRequest) {
                    // This is a login attempt with invalid credentials
                    return {
                        data: undefined,
                        error: data.message || "Invalid username or password",
                        status: 401,
                        errorDetails: { isLoginError: true, status: 401 }
                    };
                } else {
                    // 401 for authenticated requests - show error but don't logout
                    // Check if user is admin to show appropriate message
                    let isAdmin = false;
                    if (getUser) {
                        try {
                            const user = getUser();
                            isAdmin = user?.roles?.some((role: any) => role.name === "admin" || role === "admin") || false;
                        } catch (e) {
                            // User context not available, default to false
                        }
                    }

                    // Add admin info to error data for proper message display
                    const errorData = { ...data, isAdmin };
                    const standardizedError: StandardizedError = standardizeApiError(errorData, 401);
                    return {
                        data: undefined,
                        error: standardizedError.message,
                        status: 401,
                        errorDetails: standardizedError.details
                    };
                }
            }

            // Handle 403 (Forbidden) - Only logout if token is expired/invalid, not for permission issues
            if (response.status === 403) {
                const errorMessage = (data.message || data.error || "").toLowerCase();
                const isTokenExpired = (
                    errorMessage.includes("invalid token") ||
                    errorMessage.includes("token expired") ||
                    errorMessage.includes("expired token") ||
                    (errorMessage.includes("token") && !errorMessage.includes("permission") && !errorMessage.includes("forbidden"))
                );

                if (isTokenExpired) {
                    // Token expiration - logout immediately
                    logout();
                    return {
                        data: undefined,
                        error: "Session expired. Please log in again.",
                        status: 403,
                        errorDetails: { status: 403, tokenExpired: true }
                    };
                } else {
                    // Permission issue - show error but don't logout
                    // Error will be displayed by the component (admin sees "Missing permission", others see "Forbidden")
                    const standardizedError: StandardizedError = standardizeApiError(data, 403);
                    return {
                        data: undefined,
                        error: standardizedError.message,
                        status: 403,
                        errorDetails: standardizedError.details
                    };
                }
            }

            // All 2XX status codes (200-299) are considered success
            // This includes: 200 (OK), 201 (Created), 204 (No Content), etc.
            const isSuccess = response.status >= 200 && response.status < 300;

            if (isSuccess) {
                return {
                    data,
                    error: undefined,
                    status: response.status
                };
            } else {
                // All non-2XX status codes are treated as errors
                const standardizedError: StandardizedError = standardizeApiError(data, response.status);
                return {
                    data: undefined,
                    error: standardizedError.message,
                    status: response.status,
                    errorDetails: standardizedError.details
                };
            }
        } catch (error: any) {
            const standardizedError: StandardizedError = standardizeApiError(error, 0);
            return {
                data: undefined,
                error: standardizedError.message,
                status: 0,
                errorDetails: standardizedError.details
            };
        }
    };
};

// Hook for using API calls with automatic 401 handling
export const useApiCall = () => {
    const { logout, user } = useAuth();
    const getUser = useCallback(() => user, [user]);
    return useCallback(createApiCall(logout, getUser), [logout, getUser]);
};
