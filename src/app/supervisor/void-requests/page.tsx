"use client";
import React from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import VoidRequestManager from "../../components/VoidRequestManager";

export default function SupervisorVoidRequestsPage() {
  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="bg-primary text-white p-3 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h4 mb-0 fw-bold">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Void Bill Requests
            </h1>
            <span className="badge bg-light text-dark fs-6">
              Supervisor
            </span>
          </div>
        </div>

        {/* Void Request Manager */}
        <VoidRequestManager userRole="supervisor" />
      </div>
    </RoleAwareLayout>
  );
}
