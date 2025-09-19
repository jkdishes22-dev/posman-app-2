"use client";

import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import SecureRoute from "../../components/SecureRoute";
import BillingSection from "../../shared/BillingSection";

export default function AdminBillPage() {
    return (
        <SecureRoute roleRequired="admin">
            <RoleAwareLayout>
                <div className="container-fluid">
                    {/* Header */}
                    <div className="bg-danger text-white p-4 mb-4 rounded">
                        <h1 className="h3 mb-0 fw-bold">
                            <i className="bi bi-receipt me-2"></i>
                            Bill Management
                        </h1>
                        <p className="mb-0 text-white-50">Process bills and help users with billing issues</p>
                    </div>

                    {/* Billing Section */}
                    <BillingSection />
                </div>
            </RoleAwareLayout>
        </SecureRoute>
    );
}
