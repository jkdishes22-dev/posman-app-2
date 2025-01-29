"use client";

import { useEffect, useState } from "react";

import AdminLayout from "../shared/AdminLayout";
import SecureRoute from "../components/SecureRoute";
import BillingSection from "../shared/BillingSection";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("active");
  const router = useRouter();

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
