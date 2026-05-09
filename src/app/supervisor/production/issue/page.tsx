"use client";

import React from "react";
import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import ProductionIssueForm from "../../../shared/production/ProductionIssueForm";
import "bootstrap/dist/css/bootstrap.min.css";
import { Card } from "react-bootstrap";
import HelpPopover from "../../../components/HelpPopover";
import PageHeaderStrip from "../../../components/PageHeaderStrip";

export default function ProductionIssuePage() {
  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold d-flex align-items-center flex-wrap gap-2">
            <span>
              <i className="bi bi-plus-circle me-2" aria-hidden />
              Issue Production Directly
            </span>
            <HelpPopover id="issue-direct-supervisor" title="Issue production directly" wide className="text-white">
              <p className="mb-2">
                Records stock into inventory immediately—no chef preparation step. Use this when product is already made or you are bypassing the kitchen workflow.
              </p>
              <p className="mb-0">
                Alternatively, use <strong>Preparations</strong> to review and approve chef preparation requests before issuing.
              </p>
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
