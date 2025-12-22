import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import SupervisorLayout from "./SupervisorLayout";
import SalesLayout from "./SalesLayout";
import CashierLayout from "./CashierLayout";
import HomePageLayout from "./HomePageLayout";
import CashierPageLayout from "./CashierPageLayout";
import StoreKeeperPageLayout from "./StoreKeeperPageLayout";
import jwt from "jsonwebtoken";

export default function RoleAwareLayout({ children }) {
    const [role, setRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const extractRole = () => {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    const decoded = jwt.decode(token) as any;
                    if (decoded && decoded.roles && Array.isArray(decoded.roles) && decoded.roles.length > 0) {
                        // Roles in JWT are strings (role names), not objects
                        const roleName = decoded.roles[0];
                        // Ensure it's a string and lowercase for comparison
                        const normalizedRole = typeof roleName === "string" ? roleName.toLowerCase() : String(roleName).toLowerCase();
                        setRole(normalizedRole);
                        return;
                    }
                } catch (error) {
                    console.error("Error decoding token in RoleAwareLayout:", error);
                }
            }
            setRole(null);
        };

        extractRole();
        setIsLoading(false);

        // Listen for storage changes (e.g., when user logs in/out)
        const handleStorageChange = () => {
            extractRole();
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    // Show loading state briefly to avoid flashing wrong layout
    if (isLoading) {
        return <div>Loading...</div>;
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