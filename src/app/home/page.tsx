"use client";

import { withSecureRoute } from "../components/withSecureRoute";

import BillingSection from "../shared/BillingSection";
import RoleAwareLayout from "../shared/RoleAwareLayout";

const UserHomePage = () => {
  return (
    <RoleAwareLayout>
      <div>
        <BillingSection />
      </div>
    </RoleAwareLayout>
  );
};

export default withSecureRoute(UserHomePage, { roleRequired: "sales" });
