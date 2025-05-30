"use client";
import SecureRoute from "src/app/components/SecureRoute";
import CashierPageLayout from "src/app/shared/CashierPageLayout";

export default function CashierLayout({ children }: { children: React.ReactNode }) {
    return (
        <SecureRoute roleRequired="cashier">
            <CashierPageLayout>
                {children}
            </CashierPageLayout>
        </SecureRoute>
    );
}
