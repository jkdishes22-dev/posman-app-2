"use client";

import SecureRoute from "../components/SecureRoute";
import React, { useState } from "react";

import BillingSection from "../shared/BillingSection";
import HomePageLayout from "../shared/HomePageLayout";

const UserHomePage = () => {
  const [activeTab, setActiveTab] = useState("active");

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <SecureRoute roleRequired="user">
      <HomePageLayout>
        <div>
          <BillingSection
            activeTab={activeTab}
            handleTabClick={handleTabClick}
          />
        </div>
      </HomePageLayout>
    </SecureRoute>
  );
};

export default UserHomePage;
