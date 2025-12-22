import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { standardizeApiError, StandardizedError } from "./errorUtils";

export interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    errorDetails?: any;
    status: number;
}

export const createApiCall = (logout: () => void) => {
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

            if (response.status === 401) {
                // Invalid token, logout and redirect to login
                logout();
                return {
                    data: undefined,
                    error: "Session expired",
                    status: 401,
                    errorDetails: null
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
    };
};

// Hook for using API calls with automatic 401 handling
export const useApiCall = () => {
    const { logout } = useAuth();
    return useCallback(createApiCall(logout), [logout]);
};
