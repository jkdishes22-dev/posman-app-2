import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...options.headers,
                },
            });

            const data = await response.json();

            if (response.status === 401) {
                // Invalid token, logout and redirect to login
                logout();
                return {
                    data: undefined,
                    error: 'Authentication expired',
                    status: 401
                };
            }

            if (response.ok) {
                return {
                    data,
                    error: undefined,
                    status: response.status
                };
            } else {
                return {
                    data: undefined,
                    error: data.message || `Request failed with status ${response.status}`,
                    status: response.status
                };
            }
        } catch (error: any) {
            return {
                data: undefined,
                error: error.message || 'Network error',
                status: 0
            };
        }
    };
};

// Hook for using API calls with automatic 401 handling
export const useApiCall = () => {
    const { logout } = useAuth();
    return useCallback(createApiCall(logout), [logout]);
};
