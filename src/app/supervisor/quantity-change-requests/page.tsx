"use client";
import React from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import QuantityChangeRequestManager from "../../components/QuantityChangeRequestManager";

export default function SupervisorQuantityChangeRequestsPage() {
  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="bg-primary text-white p-3 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h4 mb-0 fw-bold">
              <i className="bi bi-arrow-left-right me-2"></i>
              Quantity Change Requests
            </h1>
            <span className="badge bg-light text-dark fs-6">
              Supervisor
            </span>
          </div>
        </div>

        {/* Quantity Change Request Manager */}
        <QuantityChangeRequestManager userRole="supervisor" />
      </div>
    </RoleAwareLayout>
  );
}

