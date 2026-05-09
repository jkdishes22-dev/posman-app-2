"use client";

import React from "react";
import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import ProductionIssueForm from "../../../shared/production/ProductionIssueForm";
import "bootstrap/dist/css/bootstrap.min.css";
import { Card } from "react-bootstrap";
import HelpPopover from "../../../components/HelpPopover";
import PageHeaderStrip from "../../../components/PageHeaderStrip";

export default function StorekeeperProductionIssuePage() {
  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold d-flex align-items-center flex-wrap gap-2">
            <span>
              <i className="bi bi-plus-circle me-2" aria-hidden />
              Issue Production
            </span>
            <HelpPopover id="issue-direct-storekeeper" title="Issue production" className="text-white">
              Record finished production and add quantities to inventory. Choose the item, quantity, and date—stock updates immediately after a successful issue.
            </HelpPopover>
          </h1>
        </PageHeaderStrip>

        <Card>
          <Card.Body>
            <ProductionIssueForm submitLabel="Issue Production" />
          </Card.Body>
        </Card>
      </div>
    </RoleAwareLayout>
  );
}
