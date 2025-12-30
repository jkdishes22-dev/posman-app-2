"use client";
import SecureRoute from "src/app/components/SecureRoute";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";

export default function CashierLayoutWrapper({ children }: { children: React.ReactNode }) {
    return (
        <SecureRoute rolesRequired={["cashier", "supervisor"]}>
            <RoleAwareLayout>
                {children}
            </RoleAwareLayout>
        </SecureRoute>
    );
}
