"use client";

import React from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import UserJourney from "../../components/UserJourney";
import { Container, Row, Col, Card, Accordion } from "react-bootstrap";
import { useTooltips } from "../../hooks/useTooltips";

export default function SupervisorHelpPage() {
  useTooltips();

  const journeys = [
    {
      title: "Process Bills",
      icon: "bi-cash-stack",
      prerequisites: [
        { description: "Bills exist in 'submitted' status" },
      ],
      steps: [
        {
          description: "Navigate to Bills Management > Process Bills",
          details: [
            "Click on 'Bills Management' in the sidebar",
            "Select 'Process Bills' from the submenu",
          ],
        },
        {
          description: "Select a bill to process",
          details: [
            "Bills with 'submitted' status are displayed",
            "Click a bill to view its items and total amount",
            "Tooltips on status badges explain each status — hover to read them",
          ],
        },
        {
          description: "Add payments",
          details: [
            "Click 'Add Payment' or 'Process Payment'",
            "Select payment method: Cash, M-Pesa, or both",
            "Enter payment amounts",
            "For M-Pesa, enter the transaction reference — references must be unique; duplicates are rejected",
            "Click 'Add Payment' to record",
          ],
        },
        {
          description: "Close the bill",
          details: [
            "Once total payments equal or exceed the bill total, click 'Close Bill'",
            "Confirm the closure — the bill status changes to 'closed'",
          ],
        },
      ],
    },
    {
      title: "Approve Void Requests",
      icon: "bi-check-circle",
      prerequisites: [
        { description: "Void requests have been submitted by sales users" },
        { description: "The related bill is in 'submitted' or 'reopened' status" },
      ],
      steps: [
        {
          description: "Navigate to Bills Management > Void Requests",
          details: [
            "Click on 'Bills Management' in the sidebar",
            "Select 'Void Requests' from the submenu",
          ],
        },
        {
          description: "Review pending void requests",
          details: [
            "Each request shows the bill, item, reason provided by the sales user, and the requesting user",
          ],
        },
        {
          description: "Click a void request to view full details",
          details: [
            "Verify the item to be voided and the reason",
            "Check that the bill status allows voiding",
          ],
        },
        {
          description: "Approve or reject",
          details: [
            "Click 'Approve' to void the item — its status updates immediately",
            "Click 'Reject' to deny the request — the item remains on the bill",
          ],
        },
      ],
    },
    {
      title: "Approve Quantity Change Requests",
      icon: "bi-pencil-check",
      prerequisites: [
        { description: "Sales users have submitted quantity change requests on submitted bills" },
      ],
      steps: [
        {
          description: "Navigate to Bills Management > Change Requests",
          details: [
            "Click on 'Bills Management' in the sidebar",
            "Select 'Change Requests' from the submenu",
          ],
        },
        {
          description: "Review pending quantity change requests",
          details: [
            "Each request shows the bill, item, current quantity, requested quantity, and the reason",
          ],
        },
        {
          description: "Approve or reject the request",
          details: [
            "Click 'Approve' — the item quantity on the bill is updated automatically",
            "Click 'Reject' — the original quantity remains and the sales user is notified",
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
          description: "Navigate to Bills Management > Process Bills",
          details: [
            "Click on 'Bills Management' in the sidebar",
            "Select 'Process Bills'",
          ],
        },
        {
          description: "Open the bill with issues",
          details: [
            "Find a submitted bill with a payment discrepancy or incorrect items",
            "Click the bill to view its details",
          ],
        },
        {
          description: "Click 'Reopen Bill' and provide a reason",
          details: [
            "Enter a clear reason (e.g., 'payment discrepancy', 'incorrect items', 'customer request')",
            "Click 'Reopen' to confirm",
            "The bill status changes to 'reopened' and is returned to the sales user for corrections",
          ],
        },
      ],
    },
    {
      title: "View Bills",
      icon: "bi-receipt",
      prerequisites: [
        { description: "Bills exist in the system" },
      ],
      steps: [
        {
          description: "Navigate to Bills Management > Bills",
          details: [
            "Click on 'Bills Management' in the sidebar",
            "Select 'Bills' from the submenu",
          ],
        },
        {
          description: "Browse and filter bills",
          details: [
            "Bills across all stations are shown with their current status",
            "Use status filters to view pending, submitted, closed, or reopened bills",
            "Hover over status badges to read tooltip explanations",
          ],
        },
        {
          description: "View bill details",
          details: [
            "Click any bill to see its items, payments, and status history",
            "This view is for oversight and auditing — to process payments, use Process Bills",
          ],
        },
      ],
    },
    {
      title: "Manage Menu Categories",
      icon: "bi-grid",
      prerequisites: [],
      steps: [
        {
          description: "Navigate to Menu & Pricing > Categories",
          details: [
            "Click on 'Menu & Pricing' in the sidebar",
            "Select 'Categories' from the submenu",
          ],
        },
        {
          description: "Add a new category",
          details: [
            "Enter the category name in the form at the top",
            "Click 'Add Category' — it appears in the list immediately",
          ],
        },
        {
          description: "Edit or delete a category",
          details: [
            "Select a category and click 'Edit' to rename it",
            "Click 'Delete' to remove it — categories with items attached cannot be deleted",
          ],
        },
      ],
    },
    {
      title: "Manage Pricelists",
      icon: "bi-tags",
      prerequisites: [
        { description: "Categories exist" },
        { description: "Menu items have been created" },
      ],
      steps: [
        {
          description: "Navigate to Menu & Pricing > Pricelists",
          details: [
            "Click on 'Menu & Pricing' in the sidebar",
            "Select 'Pricelists' from the submenu",
          ],
        },
        {
          description: "Create a new pricelist",
          details: [
            "Click 'Add Pricelist'",
            "Enter name, description, and set status to 'Active'",
            "Click 'Save'",
          ],
        },
        {
          description: "Add items and prices",
          details: [
            "Open the pricelist and click 'Add Items'",
            "Select items and enter their prices",
            "Save the changes",
          ],
        },
        {
          description: "Link the pricelist to a station",
          details: [
            "Navigate to Stations > Overview",
            "Open the station, find the 'Linked Pricelists' section, and add the pricelist",
          ],
        },
      ],
    },
    {
      title: "Manage Production",
      icon: "bi-box-seam",
      prerequisites: [
        { description: "Production items and definitions are configured in the system" },
      ],
      steps: [
        {
          description: "Navigate to Production",
          details: [
            "Click on 'Production' in the sidebar",
          ],
        },
        {
          description: "Issue production",
          details: [
            "Select 'Issue Production' from the submenu",
            "Search for the item to issue (leaf/component items only — grouped items cannot be issued directly)",
            "Enter the quantity and submit",
          ],
        },
        {
          description: "Review production history",
          details: [
            "Select 'Production History' from the submenu",
            "View all issued production with dates and quantities",
            "Use this for reconciliation against sales data",
          ],
        },
        {
          description: "Manage production definitions",
          details: [
            "Select 'Production Definitions' or 'Daily Production' from the submenu",
            "Configure what constitutes a production run for each item",
          ],
        },
      ],
    },
    {
      title: "View Reports",
      icon: "bi-bar-chart",
      prerequisites: [
        { description: "Bills, production, and inventory transactions exist in the system" },
      ],
      steps: [
        {
          description: "Navigate to Reports in the sidebar",
          details: [
            "Click on 'Reports' and select the report type from the submenu",
          ],
        },
        {
          description: "Select a report",
          details: [
            "Sales Revenue — total revenue for a period",
            "Items Sold Count — item-level sales breakdown",
            "Voided Items — list of all voided bill items",
            "Production-Sales Reconciliation — compare production output vs. sales",
            "Production Stock Revenue — value of production stock",
            "Expenditure — cost tracking",
          ],
        },
        {
          description: "Set date range and generate",
          details: [
            "Select start and end dates",
            "Click 'Generate Report' or 'View Report'",
          ],
        },
        {
          description: "Review and export",
          details: [
            "Review results on screen",
            "Export or print for sharing or audit purposes",
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
            Supervisor User Documentation
          </h1>
          <p className="mb-0">
            Step-by-step guides for supervisor tasks in the POS system
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-4">
          <Card.Body>
            <h5 className="mb-3">
              <i className="bi bi-info-circle me-2 text-primary"></i>
              Your Role
            </h5>
            <p>
              As a Supervisor, you oversee billing operations, approve corrections (voids and quantity
              changes), manage reopened bills, configure menus and pricelists, run production workflows,
              and generate operational reports. You bridge day-to-day sales operations and management
              oversight.
            </p>
            <p className="mb-0">
              <strong>Note:</strong> All void and quantity change approvals flow to you — Cashiers no
              longer handle those. Make sure to check Void Requests and Change Requests regularly.
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
                    <a href="/supervisor/billing" className="text-decoration-none">
                      <i className="bi bi-cash-stack me-2"></i>
                      Process Bills
                    </a>
                  </li>
                  <li className="mb-2">
                    <a href="/supervisor/bills" className="text-decoration-none">
                      <i className="bi bi-receipt me-2"></i>
                      View Bills
                    </a>
                  </li>
                  <li className="mb-2">
                    <a href="/supervisor/void-requests" className="text-decoration-none">
                      <i className="bi bi-x-circle me-2"></i>
                      Void Requests
                    </a>
                  </li>
                  <li className="mb-2">
                    <a href="/supervisor/bills/change-requests" className="text-decoration-none">
                      <i className="bi bi-pencil-square me-2"></i>
                      Quantity Change Requests
                    </a>
                  </li>
                </ul>
              </Col>
              <Col md={6}>
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <a href="/supervisor/reopened-bills" className="text-decoration-none">
                      <i className="bi bi-arrow-clockwise me-2"></i>
                      Reopened Bills
                    </a>
                  </li>
                  <li className="mb-2">
                    <a href="/supervisor/menu/category" className="text-decoration-none">
                      <i className="bi bi-grid me-2"></i>
                      Manage Categories
                    </a>
                  </li>
                  <li className="mb-2">
                    <a href="/supervisor/menu/pricelist" className="text-decoration-none">
                      <i className="bi bi-tags me-2"></i>
                      Manage Pricelists
                    </a>
                  </li>
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
  );
}
