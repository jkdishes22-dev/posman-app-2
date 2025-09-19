"use client";
import SecureRoute from "src/app/components/SecureRoute";
import CashierLayout from "src/app/shared/CashierLayout";

export default function CashierLayoutWrapper({ children }: { children: React.ReactNode }) {
    return (
        <SecureRoute roleRequired="cashier">
            <CashierLayout authError={null}>
                {children}
            </CashierLayout>
        </SecureRoute>
    );
}
