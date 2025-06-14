import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import HomePageLayout from "./HomePageLayout";
import CashierPageLayout from "./CashierPageLayout";
import jwt from "jsonwebtoken";

export default function RoleAwareLayout({ children }) {
    const [role, setRole] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            const decoded = jwt.decode(token);
            if (decoded && decoded.roles && decoded.roles.length > 0) {
                setRole(decoded.roles[0]); // Use first role, or enhance for multi-role
            }
        }
    }, []);

    if (role === "admin") return <AdminLayout>{children}</AdminLayout>;
    if (role === "cashier") return <CashierPageLayout>{children}</CashierPageLayout>;
    return <HomePageLayout>{children}</HomePageLayout>;
} 