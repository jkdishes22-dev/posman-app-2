"use client";

import { withSecureRoute } from "src/app/components/withSecureRoute";
import PricelistCatalog from "src/app/components/PricelistCatalog";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";

const PricelistCatalogPage = () => {
    return (
        <RoleAwareLayout>
            <div>
                <PricelistCatalog />
            </div>
        </RoleAwareLayout>
    );
};

export default withSecureRoute(PricelistCatalogPage, { roleRequired: "sales" });
