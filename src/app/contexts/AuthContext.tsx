"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: any | null;
    login: (token: string, user: any) => void;
    logout: () => void;
    checkAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any | null>(null);
    const router = useRouter();

    // Check if user is authenticated on mount
    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        if (token && userData) {
            try {
                // Basic token validation - check if it's not expired
                const payload = JSON.parse(atob(token.split(".")[1]));
                const currentTime = Date.now() / 1000;

                if (payload.exp && payload.exp > currentTime) {
                    setIsAuthenticated(true);
                    setUser(JSON.parse(userData));
                } else {
                    // Token is expired, clear it
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                }
            } catch (error) {
                // Invalid token, clear it
                localStorage.removeItem("token");
                localStorage.removeItem("user");
            }
        }

        setIsLoading(false);
    }, []);

    const login = useCallback((token: string, userData: any) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));
        // Store token set time to detect race conditions
        localStorage.setItem("token_set_time", Date.now().toString());
        setIsAuthenticated(true);
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        try {
            // Clear all localStorage items related to auth
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("token_set_time");
            
            // Clear state
            setIsAuthenticated(false);
            setUser(null);
            
            // Use window.location.replace for immediate redirect (doesn't add to history)
            if (typeof window !== "undefined") {
                // Clear any pending API calls or timers
                window.location.replace("/");
            } else {
                router.push("/");
            }
        } catch (error) {
            console.error("Error during logout:", error);
            // Force redirect even if there's an error
            if (typeof window !== "undefined") {
                window.location.replace("/");
            }
        }
    }, [router]);

    const checkAuth = useCallback((): boolean => {
        const token = localStorage.getItem("token");
        if (!token || token === "null" || token === "undefined" || token.trim() === "") {
            // Don't logout here - let the component handle it
            return false;
        }

        try {
            // Verify token format (should be a JWT with 3 parts)
            const tokenParts = token.split(".");
            if (tokenParts.length !== 3) {
                // Invalid token format - don't logout, just return false
                return false;
            }

            const payload = JSON.parse(atob(tokenParts[1]));
            const currentTime = Date.now() / 1000;

            if (payload.exp && payload.exp > currentTime) {
                return true;
            } else {
                // Token expired - don't logout here, let the component handle it
                return false;
            }
        } catch (error) {
            // Invalid token - don't logout here, just return false
            console.warn("Token validation failed in checkAuth:", error);
            return false;
        }
    }, []);

    const contextValue: AuthContextType = {
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        checkAuth,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};