"use client";

import React from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
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
        { description: "Bills exist in submitted status" },
      ],
      steps: [
        {
          description: "Navigate to Bills",
          details: [
            "Click on 'Bills' in the sidebar menu",
            "You will see all submitted bills",
          ],
        },
        {
          description: "Select a bill to process",
          details: [
            "Click on a bill with 'submitted' status",
            "View the bill details including items and total amount",
          ],
        },
        {
          description: "Add payment to the bill",
          details: [
            "Click 'Add Payment' button",
            "Select payment method: Cash, M-Pesa, or both",
            "Enter payment amounts",
            "For M-Pesa payments, enter the transaction reference",
            "Click 'Add Payment' to record",
          ],
        },
        {
          description: "Add multiple payments if needed",
          details: [
            "You can add multiple payments for the same bill",
            "For example: partial cash + partial M-Pesa",
            "Continue adding payments until total is covered",
          ],
        },
        {
          description: "Close the bill",
          details: [
            "Once total payments equal or exceed the bill total, click 'Close Bill'",
            "Confirm the bill closure",
            "The bill status will change to 'closed'",
          ],
        },
      ],
    },
    {
      title: "Approve Void Requests",
      icon: "bi-check-circle",
      prerequisites: [
        { description: "Void requests exist from sales users" },
      ],
      steps: [
        {
          description: "Navigate to Void Requests",
          details: [
            "Click on 'Void Requests' in the sidebar menu",
            "You will see all pending void requests",
          ],
        },
        {
          description: "View pending void requests",
          details: [
            "Each request shows the bill, item, reason, and requesting user",
            "Review the details of each request",
          ],
        },
        {
          description: "Review a void request",
          details: [
            "Click on a void request to view full details",
            "Verify the item and reason for voiding",
            "Check that the bill status allows voiding",
          ],
        },
        {
          description: "Approve or reject the request",
          details: [
            "Click 'Approve' to approve the void request",
            "Or click 'Reject' to deny the void request",
            "The item status will be updated accordingly",
          ],
        },
      ],
    },
    {
      title: "Reopen Bills",
      icon: "bi-arrow-clockwise",
      prerequisites: [
        { description: "Bills exist in submitted status with payment issues" },
        { description: "There are actual payment discrepancies or other issues" },
      ],
      steps: [
        {
          description: "Navigate to Bills",
          details: [
            "Click on 'Bills' in the sidebar menu",
            "View submitted bills",
          ],
        },
        {
          description: "Select a bill with issues",
          details: [
            "Find a bill in 'submitted' status that has payment discrepancies",
            "Click on the bill to view its details",
          ],
        },
        {
          description: "Click 'Reopen Bill' button",
          details: [
            "The reopen button is available for bills with payment issues",
            "Click the button to open the reopen dialog",
          ],
        },
        {
          description: "Provide reopen reason",
          details: [
            "Enter a clear reason for reopening the bill",
            "Common reasons: payment discrepancy, incorrect amount, customer request",
            "Click 'Reopen' to confirm",
          ],
        },
        {
          description: "Bill status changes to 'reopened'",
          details: [
            "The bill will be returned to the sales user for corrections",
            "Sales user can make changes and resubmit",
          ],
        },
      ],
    },
    {
      title: "Bulk Close Bills",
      icon: "bi-check-all",
      prerequisites: [
        { description: "Multiple bills exist in submitted status" },
        { description: "All bills have payments recorded" },
      ],
      steps: [
        {
          description: "Navigate to Bills",
          details: [
            "Click on 'Bills' in the sidebar menu",
            "View all submitted bills",
          ],
        },
        {
          description: "Select multiple bills",
          details: [
            "Check the boxes next to bills you want to close",
            "Select bills that have payments recorded",
            "You can select multiple bills at once",
          ],
        },
        {
          description: "Click 'Bulk Close' button",
          details: [
            "The bulk close button is available when bills are selected",
            "Click the button to open the bulk close dialog",
          ],
        },
        {
          description: "Review selected bills",
          details: [
            "Verify all selected bills are correct",
            "Check that all bills have payments",
            "Review the total amount to be closed",
          ],
        },
        {
          description: "Confirm bulk close",
          details: [
            "Click 'Confirm' to close all selected bills",
            "All bills will be closed at once",
            "The status of all selected bills will change to 'closed'",
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
          description: "Navigate to Reports",
          details: [
            "Click on 'Reports' in the sidebar menu",
            "Expand the reports submenu",
          ],
        },
        {
          description: "Select report type",
          details: [
            "Sales Revenue: View sales revenue reports",
            "Items Sold Count: View items sold statistics",
            "Voided Items: View voided items report",
            "Expenditure: View expenditure reports",
            "Invoices & Pending Bills: View pending bills report",
            "Other available reports as needed",
          ],
        },
        {
          description: "Set date range (if applicable)",
          details: [
            "Select start date and end date for the report",
            "Use date pickers to choose the period",
            "Click 'Generate Report' or 'View Report'",
          ],
        },
        {
          description: "View and analyze results",
          details: [
            "Review the report data",
            "Export or print the report if needed",
            "Use filters to drill down into specific data",
          ],
        },
      ],
    },
  ];

  return (
    <RoleAwareLayout>
      <Container fluid className="py-4">
        {/* Header */}
        <div className="bg-primary text-white p-4 mb-4 rounded">
          <h1 className="h3 mb-2">
            <i className="bi bi-question-circle me-2"></i>
            Cashier User Documentation
          </h1>
          <p className="mb-0">
            Step-by-step guides for common cashier tasks in the POS system
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-4">
          <Card.Body>
            <h5 className="mb-3">
              <i className="bi bi-info-circle me-2 text-primary"></i>
              About This Documentation
            </h5>
            <p>
              This documentation provides detailed user journeys for cashier tasks.
              Each journey includes prerequisites that must be completed first, followed by
              step-by-step instructions to complete the task.
            </p>
            <p className="mb-0">
              <strong>Note:</strong> Make sure to complete all prerequisites before starting
              any journey to ensure a smooth workflow.
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
                  <li className="mb-2">
                    <a href="/home/cashier/void-requests" className="text-decoration-none">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Void Requests
                    </a>
                  </li>
                </ul>
              </Col>
              <Col md={6}>
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <a href="/admin/reports" className="text-decoration-none">
                      <i className="bi bi-bar-chart me-2"></i>
                      Reports & Analytics
                    </a>
                  </li>
                </ul>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Container>
    </RoleAwareLayout>
  );
}

