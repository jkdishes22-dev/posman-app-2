"use client";

import { withSecureRoute } from "../../components/withSecureRoute";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import BillingSection from "../../shared/BillingSection";
import PageHeaderStrip from "../../components/PageHeaderStrip";
import StationSwitcher from "../../components/StationSwitcher";
import PricelistSwitcher from "../../components/PricelistSwitcher";

const SalesBillingPage = () => {
    return (
        <RoleAwareLayout>
            {/*
             * d-flex flex-column h-100: makes this container fill the flex-grow-1 main element
             * so BillingSection can use height:100% and lock to the viewport.
             */}
            <div className="container-fluid p-0 d-flex flex-column h-100">
                <PageHeaderStrip
                    className="py-2 mb-0"
                    actions={
                        <>
                            <StationSwitcher size="sm" showLabel={false} allowAllUsers buttonVariant="outline-light" />
                            <PricelistSwitcher size="sm" showLabel={false} buttonVariant="outline-light" />
                        </>
                    }
                >
                    <h1 className="h6 mb-0 fw-bold">
                        <i className="bi bi-cart me-2" aria-hidden></i>
                        Billing
                    </h1>
                </PageHeaderStrip>
                {/* flex-grow-1 + minHeight:0 lets BillingSection fill remaining space */}
                <div className="flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
                    <BillingSection />
                </div>
            </div>
        </RoleAwareLayout>
    );
};

export default withSecureRoute(SalesBillingPage, { rolesRequired: ["sales", "supervisor"] });
