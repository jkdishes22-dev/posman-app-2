import React, { useEffect, useState, ReactNode } from "react";
import AdminLayout from "./AdminLayout";
import HomePageLayout from "./HomePageLayout";
import CashierPageLayout from "./CashierPageLayout";
import jwt from "jsonwebtoken";

interface RoleAwareLayoutProps {
    children: ReactNode;
}

export default function RoleAwareLayout({ children }: RoleAwareLayoutProps) {
    const [role, setRole] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = jwt.decode(token) as any;
            if (decoded && decoded.roles && decoded.roles.length > 0) {
                setRole(decoded.roles[0]); // Use first role, or enhance for multi-role
            }
        }
    }, []);

    if (role === "admin") return <AdminLayout authError={null}>{children}</AdminLayout>;
    if (role === "supervisor") return <AdminLayout authError={null}>{children}</AdminLayout>;
    if (role === "sales") return <HomePageLayout>{children}</HomePageLayout>;
    if (role === "cashier") return <CashierPageLayout>{children}</CashierPageLayout>;
    if (role === "storekeeper") return <AdminLayout authError={null}>{children}</AdminLayout>;
    return <HomePageLayout>{children}</HomePageLayout>;
} 