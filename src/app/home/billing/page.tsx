"use client";

import { withSecureRoute } from "../../components/withSecureRoute";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import BillingSection from "../../shared/BillingSection";

const SalesBillingPage = () => {
    return (
        <RoleAwareLayout>
            <div className="container-fluid p-0">
                {/* Billing Section */}
                <BillingSection />
            </div>
        </RoleAwareLayout>
    );
};

export default withSecureRoute(SalesBillingPage, { rolesRequired: ["sales", "supervisor"] });
