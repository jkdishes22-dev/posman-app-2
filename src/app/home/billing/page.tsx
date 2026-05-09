"use client";

import { withSecureRoute } from "../../components/withSecureRoute";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import BillingSection from "../../shared/BillingSection";
import PageHeaderStrip from "../../components/PageHeaderStrip";

const SalesBillingPage = () => {
    return (
        <RoleAwareLayout>
            <div className="container-fluid p-0">
                <PageHeaderStrip>
                    <h1 className="h4 mb-0 fw-bold">
                        <i className="bi bi-cart me-2" aria-hidden></i>
                        Billing
                    </h1>
                </PageHeaderStrip>
                {/* Billing Section */}
                <BillingSection />
            </div>
        </RoleAwareLayout>
    );
};

export default withSecureRoute(SalesBillingPage, { rolesRequired: ["sales", "supervisor"] });
