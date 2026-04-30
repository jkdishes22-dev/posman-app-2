"use client";

import React from "react";
import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import ProductionIssueForm from "../../../shared/production/ProductionIssueForm";
import "bootstrap/dist/css/bootstrap.min.css";
import { Card } from "react-bootstrap";
import { useTooltips } from "../../../hooks/useTooltips";

export default function ProductionIssuePage() {
  useTooltips();

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <div className="bg-primary text-white p-3 mb-4">
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-plus-circle me-2" />
            Issue Production Directly
            <i
              className="bi bi-question-circle ms-2"
              style={{ cursor: "help", fontSize: "0.9rem" }}
              data-bs-toggle="tooltip"
              data-bs-placement="bottom"
              title="Issue production directly (bypasses chef preparation workflow). Alternatively, review and approve chef preparation requests on the Preparations page."
            />
          </h1>
          <p className="mb-0 small">
            Issue production directly (bypasses chef preparation workflow)
          </p>
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
