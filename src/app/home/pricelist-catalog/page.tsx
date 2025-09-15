"use client";

import { withSecureRoute } from "src/app/components/withSecureRoute";
import PricelistCatalog from "src/app/components/PricelistCatalog";
import HomePageLayout from "src/app/shared/HomePageLayout";

const PricelistCatalogPage = () => {
    return (
        <HomePageLayout>
            <div>
                <PricelistCatalog />
            </div>
        </HomePageLayout>
    );
};

export default withSecureRoute(PricelistCatalogPage, { roleRequired: "sales" });
