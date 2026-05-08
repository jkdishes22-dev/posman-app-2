"use client";

import { withSecureRoute } from "src/app/components/withSecureRoute";
import PricelistCatalog from "src/app/components/PricelistCatalog";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";

const PricelistCatalogPage = () => {
    return (
        <RoleAwareLayout>
            <div className="container-fluid p-0 sales-pricelist-screen">
                <PricelistCatalog />
            </div>
        </RoleAwareLayout>
    );
};

export default withSecureRoute(PricelistCatalogPage, { roleRequired: "sales" });
