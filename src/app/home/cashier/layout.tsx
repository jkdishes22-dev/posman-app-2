"use client";
import SecureRoute from "src/app/components/SecureRoute";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";

export default function CashierLayout({ children }: { children: React.ReactNode }) {
    return (
        <SecureRoute roleRequired="cashier">
            <RoleAwareLayout>
                {children}
            </RoleAwareLayout>
        </SecureRoute>
    );
}
