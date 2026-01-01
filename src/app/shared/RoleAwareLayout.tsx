"use client";

import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import SupervisorLayout from "./SupervisorLayout";
import SalesLayout from "./SalesLayout";
import CashierLayout from "./CashierLayout";
import HomePageLayout from "./HomePageLayout";
import CashierPageLayout from "./CashierPageLayout";
import StoreKeeperPageLayout from "./StoreKeeperPageLayout";
import { useAuth } from "../contexts/AuthContext";
import jwt from "jsonwebtoken";

interface RoleAwareLayoutProps {
    children: React.ReactNode;
}

export default function RoleAwareLayout({ children }: RoleAwareLayoutProps) {
    const [role, setRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { logout, isAuthenticated } = useAuth();

    useEffect(() => {
        const extractRole = () => {
            const token = localStorage.getItem("token");
            if (!token) {
                // No token - if we were authenticated, logout
                if (isAuthenticated) {
                    logout();
                }
                setRole(null);
                setIsLoading(false);
                return;
            }

            try {
                const decoded = jwt.decode(token) as any;

                // Check if token is expired
                if (decoded && decoded.exp) {
                    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
                    const currentTime = Date.now();
                    if (currentTime >= expirationTime) {
                        // Token is expired - logout properly
                        console.warn("Token expired in RoleAwareLayout");
                        logout();
                        setRole(null);
                        setIsLoading(false);
                        return;
                    }
                }

                if (decoded && decoded.roles) {
                    // Handle both array and single role formats
                    let rolesArray: any[] = [];
                    if (Array.isArray(decoded.roles)) {
                        rolesArray = decoded.roles;
                    } else if (typeof decoded.roles === "string") {
                        rolesArray = [decoded.roles];
                    } else if (decoded.roles && typeof decoded.roles === "object") {
                        // Handle case where roles might be objects with a "name" property
                        rolesArray = Array.isArray(decoded.roles) ? decoded.roles : [decoded.roles];
                    }

                    if (rolesArray.length > 0) {
                        // Extract role name - handle both string and object formats
                        const firstRole = rolesArray[0];
                        const roleName = typeof firstRole === "string"
                            ? firstRole
                            : (firstRole?.name || firstRole?.role || String(firstRole));

                        // Normalize role name
                        const normalizedRole = typeof roleName === "string"
                            ? roleName.toLowerCase()
                            : String(roleName).toLowerCase();

                        setRole(normalizedRole);
                        setIsLoading(false);
                        return;
                    }
                }
            } catch (error) {
                console.error("Error decoding token in RoleAwareLayout:", error);
                // Don't logout on decode errors - token might still be valid
                // Let apiUtils handle token validation on next API call
                // Only logout if token is actually expired (checked earlier) or missing
                setRole(null);
                setIsLoading(false);
                return;
            }

            // No valid role found - if we have a token but no role, something is wrong
            const currentToken = localStorage.getItem("token");
            if (currentToken && !role) {
                // Token exists but couldn't extract role - might be invalid
                // Don't logout here, let apiUtils handle it on next API call
                setRole(null);
                setIsLoading(false);
            } else {
                setRole(null);
                setIsLoading(false);
            }
        };

        extractRole();

        // Listen for storage changes (e.g., when user logs in/out)
        const handleStorageChange = () => {
            setIsLoading(true);
            extractRole();
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [logout, isAuthenticated]);

    // Show loading state briefly to avoid flashing wrong layout
    if (isLoading) {
        return <div>Loading...</div>;
    }

    // If there's no token and we're not authenticated, we're likely being logged out
    // Show a redirecting message instead of the default layout
    const token = localStorage.getItem("token");
    if (!token && !isAuthenticated && role === null) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Redirecting...</span>
                    </div>
                    <p className="text-muted">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    // Role-based layout selection (case-insensitive)
    const normalizedRole = role?.toLowerCase();

    if (normalizedRole === "admin") {
        return <AdminLayout authError={null}>{children}</AdminLayout>;
    }
    if (normalizedRole === "supervisor") {
        return <SupervisorLayout authError={null}>{children}</SupervisorLayout>;
    }
    if (normalizedRole === "sales") {
        return <SalesLayout authError={null}>{children}</SalesLayout>;
    }
    if (normalizedRole === "cashier") {
        return <CashierLayout authError={null}>{children}</CashierLayout>;
    }
    if (normalizedRole === "storekeeper") {
        return <StoreKeeperPageLayout authError={null}>{children}</StoreKeeperPageLayout>;
    }

    // Default fallback for users without a recognized role
    return <HomePageLayout>{children}</HomePageLayout>;
} 