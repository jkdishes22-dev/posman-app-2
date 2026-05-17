"use client";

import BillPaymentsReportView from "../../../shared/reports/BillPaymentsReportView";

export default function SupervisorBillPaymentsReportPage() {
  return (
    <BillPaymentsReportView
      subtitle="Supervisor view of all bill payments and payment filters"
      containerClassName="supervisor-bill-payments-screen"
    />
  );
}
