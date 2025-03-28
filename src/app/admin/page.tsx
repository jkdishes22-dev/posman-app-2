"use client";

import { useState } from "react";

import AdminLayout from "../shared/AdminLayout";
import SecureRoute from "../components/SecureRoute";
import BillingSection from "../shared/BillingSection";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("active");

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
  };
  return (
    <SecureRoute roleRequired="admin">
      <AdminLayout authError={null}>
        <div>
          <BillingSection
            activeTab={activeTab}
            handleTabClick={handleTabClick}
          />
        </div>{" "}
      </AdminLayout>
    </SecureRoute>
  );
}
