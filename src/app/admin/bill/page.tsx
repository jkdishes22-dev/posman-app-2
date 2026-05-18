"use client";

import RoleAwareLayout from "../../shared/RoleAwareLayout";
import SecureRoute from "../../components/SecureRoute";
import BillingSection from "../../shared/BillingSection";
import PageHeaderStrip from "../../components/PageHeaderStrip";
import StationSwitcher from "../../components/StationSwitcher";
import PricelistSwitcher from "../../components/PricelistSwitcher";

export default function AdminBillPage() {
    return (
        <SecureRoute roleRequired="admin">
            <RoleAwareLayout>
                <div className="container-fluid p-0">
                    <PageHeaderStrip
                        actions={
                            <>
                                <StationSwitcher size="sm" showLabel={false} allowAllUsers buttonVariant="outline-light" />
                                <PricelistSwitcher size="sm" showLabel={false} buttonVariant="outline-light" />
                            </>
                        }
                    >
                        <h1 className="h4 mb-0 fw-bold">
                            <i className="bi bi-cart me-2" aria-hidden></i>
                            Billing
                        </h1>
                    </PageHeaderStrip>
                    <BillingSection />
                </div>
            </RoleAwareLayout>
        </SecureRoute>
    );
}
