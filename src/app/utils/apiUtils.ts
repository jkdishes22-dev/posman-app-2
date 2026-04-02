import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { standardizeApiError, StandardizedError } from "./errorUtils";
import { requestCache } from "./requestCache";

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
        // Create cache key from URL and options (for GET requests only)
        const isGetRequest = !options.method || options.method === "GET";
        const cacheKey = isGetRequest ? `api_${url}_${JSON.stringify(options)}` : null;

        // Use request deduplication for GET requests
        if (cacheKey && isGetRequest) {
            return requestCache.getOrCreate(cacheKey, async () => {
                return executeRequest<T>(url, options, logout, getUser);
            });
        }

        // For non-GET requests, execute directly
        return executeRequest<T>(url, options, logout, getUser);
    };
};

async function executeRequest<T = any>(
    url: string,
    options: RequestInit = {},
    logout: () => void,
    getUser?: () => any
): Promise<ApiResponse<T>> {
    try {
        const token = localStorage.getItem("token");
        const publicEndpoints = [
            "/api/auth/login",
            "/api/system/setup-status",
            "/api/system/setup-initialize"
        ];
        const isPublicRequest = publicEndpoints.some(endpoint => url.includes(endpoint));

        // If no token and this is not a login request, return error immediately
        // Don't logout here - let the component handle it
        if (!token && !isPublicRequest) {
            return {
                data: undefined,
                error: "No authentication token found",
                status: 401,
                errorDetails: { status: 401, noToken: true }
            };
        }

        // Build headers - only add Authorization if token is valid (not null, undefined, or empty)
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...(options.headers as Record<string, string> || {}),
        };

        // Only add Authorization header if token exists and is valid
        if (token && token !== "null" && token !== "undefined" && token.trim() !== "") {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Check if response is JSON before trying to parse
        const contentType = response.headers.get("content-type");
        let data;
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            // If not JSON, try to get text and create error response
            const text = await response.text();
            console.error("Non-JSON response from server:", text.substring(0, 200));
            data = {
                message: `Server error (${response.status}): ${response.statusText}`,
                error: text.substring(0, 500)
            };
        }

        // Handle 401 (Unauthorized) - Check if token is invalid/expired
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
                // Check if this is a token expiration/invalid token error
                const errorMessage = (data.message || data.error || "").toLowerCase();
                const isTokenExpired = (
                    errorMessage.includes("invalid token") ||
                    errorMessage.includes("token expired") ||
                    errorMessage.includes("expired token") ||
                    errorMessage.includes("no token provided") ||
                    errorMessage.includes("jwt") ||
                    errorMessage.includes("malformed")
                );

                // Check if it's a "User not authenticated" error
                // This means auth middleware failed to set req.user, which indicates token verification failed
                // This is ALWAYS a token issue - we should logout
                const isUserNotAuthenticated = errorMessage.includes("user not authenticated");

                if (isTokenExpired || isUserNotAuthenticated) {
                    // Token expiration/invalid OR auth middleware failed - logout immediately
                    // "User not authenticated" means req.user?.id is undefined, which means auth middleware failed
                    // This indicates the token is invalid or expired
                    // BUT: If this happens right after login (within 2 seconds), it might be a race condition
                    // Check if token was just set (within last 2 seconds) - if so, don't logout yet
                    const tokenSetTime = localStorage.getItem("token_set_time");
                    const now = Date.now();
                    const timeSinceTokenSet = tokenSetTime ? now - parseInt(tokenSetTime, 10) : Infinity;
                    const isRecentLogin = timeSinceTokenSet < 2000; // 2 seconds grace period

                    if (isRecentLogin && url.includes("/api/users/me/stations")) {
                        // Recent login and stations endpoint - might be race condition
                        // Return error but don't logout - let user stay logged in
                        console.warn("401 on stations endpoint right after login - possible race condition, not logging out");
                        return {
                            data: undefined,
                            error: "Unable to load stations. Please refresh the page.",
                            status: 401,
                            errorDetails: { status: 401, tokenExpired: false, noToken: false, possibleRaceCondition: true }
                        };
                    }

                    // Not a recent login or not stations endpoint - logout
                    logout();
                    return {
                        data: undefined,
                        error: "Session expired. Please log in again.",
                        status: 401,
                        errorDetails: { status: 401, tokenExpired: true, noToken: !isTokenExpired }
                    };
                } else {
                    // 401 for other reasons (e.g., missing permissions) - show error but don't logout
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
        }

        // Handle 403 (Forbidden) - NEVER logout on 403
        // 403 means user is authenticated but lacks permission - this is NOT a token issue
        // After successful login, 403 should NEVER trigger logout
        if (response.status === 403) {
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
}

// Hook for using API calls with automatic 401 handling
export const useApiCall = () => {
    const { logout, user } = useAuth();
    const getUser = useCallback(() => user, [user]);
    return useCallback(createApiCall(logout, getUser), [logout, getUser]);
};
