"use client";

import React from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import PageHeaderStrip from "../../components/PageHeaderStrip";
import SecureRoute from "../../components/SecureRoute";
import UserJourney from "../../components/UserJourney";
import { Container, Row, Col, Card, Accordion } from "react-bootstrap";
import { useTooltips } from "../../hooks/useTooltips";

export default function CashierHelpPage() {
  useTooltips();

  const journeys = [
    {
      title: "Process Bill Payments",
      icon: "bi-credit-card",
      prerequisites: [
        { description: "Bills exist in 'submitted' status" },
      ],
      steps: [
        {
          description: "Navigate to Bills in the sidebar",
          details: [
            "Click on 'Bills' in the sidebar menu to see all submitted bills",
          ],
        },
        {
          description: "Select a bill to process",
          details: [
            "Click on a bill with 'submitted' status",
            "Review the bill items and total amount",
          ],
        },
        {
          description: "Add payment to the bill",
          details: [
            "Click 'Add Payment'",
            "Select the payment method: Cash, M-Pesa, or both",
            "Enter the payment amount(s)",
            "For M-Pesa payments, enter the transaction reference — references must be unique; duplicates are rejected",
            "Click 'Add Payment' to record",
          ],
        },
        {
          description: "Add multiple payments if needed",
          details: [
            "You can record multiple payments on the same bill (e.g., partial cash + partial M-Pesa)",
            "Continue adding payments until the total equals or exceeds the bill amount",
          ],
        },
        {
          description: "Close the bill",
          details: [
            "Once total payments cover the bill amount, click 'Close Bill'",
            "Confirm the closure — the bill status changes to 'closed'",
          ],
        },
      ],
    },
    {
      title: "Reopen Bills",
      icon: "bi-arrow-clockwise",
      prerequisites: [
        { description: "A bill is in 'submitted' status with payment discrepancies or other issues" },
      ],
      steps: [
        {
          description: "Navigate to Bills and find the bill with issues",
          details: [
            "Click on 'Bills' in the sidebar",
            "Find a submitted bill that has a payment discrepancy or incorrect items",
            "Click the bill to view its details",
          ],
        },
        {
          description: "Click 'Reopen Bill'",
          details: [
            "The reopen button is available for submitted bills",
          ],
        },
        {
          description: "Provide a reopen reason",
          details: [
            "Enter a clear reason (e.g., 'payment discrepancy', 'incorrect amount')",
            "Click 'Reopen' to confirm",
            "The bill status changes to 'reopened' and is returned to the sales user for corrections",
          ],
        },
      ],
    },
    {
      title: "Bulk Close Bills",
      icon: "bi-check-all",
      prerequisites: [
        { description: "Multiple bills exist in 'submitted' status" },
        { description: "All selected bills have payments that equal or exceed their totals" },
      ],
      steps: [
        {
          description: "Navigate to Bills",
          details: [
            "Click on 'Bills' in the sidebar to view submitted bills",
          ],
        },
        {
          description: "Select multiple bills to close",
          details: [
            "Check the boxes next to bills you want to close",
            "Only select bills that already have sufficient payment recorded",
          ],
        },
        {
          description: "Click 'Bulk Close'",
          details: [
            "The bulk close button appears when bills are selected",
          ],
        },
        {
          description: "Review and confirm",
          details: [
            "Verify the list of selected bills and the total amount",
            "Click 'Confirm' to close all selected bills at once",
            "All selected bills will move to 'closed' status",
          ],
        },
      ],
    },
    {
      title: "View Reports",
      icon: "bi-bar-chart",
      prerequisites: [
        { description: "Bills and payments exist in the system" },
      ],
      steps: [
        {
          description: "Navigate to Reports in the sidebar",
          details: [
            "Click on 'Reports' and expand the submenu",
          ],
        },
        {
          description: "Select a report type",
          details: [
            "Sales Revenue — view revenue over a selected period",
            "Items Sold Count — see which items sold and in what quantities",
            "Voided Items — review all voided bill items",
            "Expenditure — track costs for the period",
            "Invoices & Pending Bills — see outstanding bills",
          ],
        },
        {
          description: "Set the date range and generate",
          details: [
            "Select start and end dates using the date pickers",
            "Click 'Generate Report' or 'View Report' to load results",
          ],
        },
        {
          description: "Review and export",
          details: [
            "Review the report data on screen",
            "Export or print if available for sharing or record-keeping",
          ],
        },
      ],
    },
  ];

  return (
    <SecureRoute roleRequired="cashier">
    <RoleAwareLayout>
      <Container fluid className="py-4">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-question-circle me-2" aria-hidden></i>
            Cashier User Documentation
          </h1>
          <p className="mb-0 mt-2 small text-white-50">
            Step-by-step guides for cashier tasks in the POS system
          </p>
        </PageHeaderStrip>

        {/* Introduction */}
        <Card className="mb-4">
          <Card.Body>
            <h5 className="mb-3">
              <i className="bi bi-info-circle me-2 text-primary"></i>
              Your Role
            </h5>
            <p>
              As a Cashier, you process payments for submitted bills, manage bill reopening, and
              bulk-close bills at end of shift. Your actions directly move bills to &apos;closed&apos; status.
            </p>
            <p className="mb-0">
              <strong>Note:</strong> Void approvals and quantity change request approvals are handled
              by Supervisors — you do not need to action those.
            </p>
          </Card.Body>
        </Card>

        {/* User Journeys */}
        <Row>
          <Col>
            <h2 className="h4 mb-4">
              <i className="bi bi-list-check me-2"></i>
              User Journeys
            </h2>
            <Accordion defaultActiveKey="0">
              {journeys.map((journey, index) => (
                <UserJourney
                  key={index}
                  title={journey.title}
                  prerequisites={journey.prerequisites}
                  steps={journey.steps}
                  icon={journey.icon}
                  eventKey={index.toString()}
                />
              ))}
            </Accordion>
          </Col>
        </Row>

        {/* Quick Links */}
        <Card className="mt-4">
          <Card.Body>
            <h5 className="mb-3">
              <i className="bi bi-link-45deg me-2 text-primary"></i>
              Quick Links
            </h5>
            <Row>
              <Col md={6}>
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <a href="/home/cashier/bills" className="text-decoration-none">
                      <i className="bi bi-receipt me-2"></i>
                      Process Bills
                    </a>
                  </li>
                </ul>
              </Col>
              <Col md={6}>
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <a href="/admin/reports" className="text-decoration-none">
                      <i className="bi bi-bar-chart me-2"></i>
                      Reports &amp; Analytics
                    </a>
                  </li>
                </ul>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Container>
    </RoleAwareLayout>
    </SecureRoute>
  );
}
