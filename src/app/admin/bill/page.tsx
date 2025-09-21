"use client";

import RoleAwareLayout from "../../shared/RoleAwareLayout";
import SecureRoute from "../../components/SecureRoute";
import BillingSection from "../../shared/BillingSection";

export default function AdminBillPage() {
    return (
        <SecureRoute roleRequired="admin">
            <RoleAwareLayout>
                <div className="container-fluid">
                    {/* Billing Section */}
                    <BillingSection />
                </div>
            </RoleAwareLayout>
        </SecureRoute>
    );
}
