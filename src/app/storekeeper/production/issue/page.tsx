"use client";

import React from "react";
import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import ProductionIssueForm from "../../../shared/production/ProductionIssueForm";
import "bootstrap/dist/css/bootstrap.min.css";
import { Card } from "react-bootstrap";
import { useTooltips } from "../../../hooks/useTooltips";

export default function StorekeeperProductionIssuePage() {
  useTooltips();

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <div className="bg-primary text-white p-3 mb-4">
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-plus-circle me-2" />
            Issue Production
          </h1>
          <p className="mb-0 small">Record items produced and add them to inventory</p>
        </div>

        <Card>
          <Card.Body>
            <ProductionIssueForm submitLabel="Issue Production" />
          </Card.Body>
        </Card>
      </div>
    </RoleAwareLayout>
  );
}
