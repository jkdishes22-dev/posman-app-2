import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import SupervisorLayout from "./SupervisorLayout";
import SalesLayout from "./SalesLayout";
import CashierLayout from "./CashierLayout";
import HomePageLayout from "./HomePageLayout";
import CashierPageLayout from "./CashierPageLayout";
import jwt from "jsonwebtoken";

export default function RoleAwareLayout({ children }) {
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
    if (role === "supervisor") return <SupervisorLayout authError={null}>{children}</SupervisorLayout>;
    if (role === "sales") return <SalesLayout authError={null}>{children}</SalesLayout>;
    if (role === "cashier") return <CashierLayout authError={null}>{children}</CashierLayout>;
    return <HomePageLayout>{children}</HomePageLayout>;
} 