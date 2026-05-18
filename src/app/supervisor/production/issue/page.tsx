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
              Issue Production
            </span>
            <HelpPopover id="issue-direct-supervisor" title="Issue production" wide className="text-white">
              <p className="mb-2">
                Select or create a production run, then issue items into it. Each run groups the
                items issued in a session — you can have multiple runs in a day.
              </p>
              <p className="mb-0">
                Issuing adds quantities directly to inventory.
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
