"use client";

import SecureRoute from "src/app/components/SecureRoute";
import CashierPageLayout from "src/app/shared/CashierPageLayout";
import CashierBillsPage from "./bills/page";

const CashierLandingPage = () => {
  return (
    <SecureRoute roleRequired="cashier">
      <CashierPageLayout>
        <CashierBillsPage />
      </CashierPageLayout>
    </SecureRoute>
  );
};

export default CashierLandingPage;
