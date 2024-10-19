"use client";

import SecureRoute from "../components/SecureRoute";

import BillingSection from "../shared/BillingSection";
import HomePageLayout from "../shared/HomePageLayout";

const UserHomePage = () => {
  return (
    <SecureRoute roleRequired="user">
      <HomePageLayout>
        <div>
          <BillingSection />
        </div>
      </HomePageLayout>
    </SecureRoute>
  );
};

export default UserHomePage;
