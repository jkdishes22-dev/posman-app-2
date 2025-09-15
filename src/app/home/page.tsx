"use client";

import { withSecureRoute } from "../components/withSecureRoute";

import BillingSection from "../shared/BillingSection";
import HomePageLayout from "../shared/HomePageLayout";

const UserHomePage = () => {
  return (
    <HomePageLayout>
      <div>
        <BillingSection />
      </div>
    </HomePageLayout>
  );
};

export default withSecureRoute(UserHomePage, { roleRequired: "sales" });
