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
        { description: "Bills exist in submitted status" },
        { description: "You have cashier or supervisor permissions" },
      ],
      steps: [
        {
          description: "Navigate to Bills Management > Process Bills",
          details: [
            "Click on 'Bills Management' in the sidebar menu",
            "Select 'Process Bills' from the submenu",
          ],
        },
        {
          description: "View submitted bills",
          details: [
            "Bills with 'submitted' status will be displayed",
            "Use filters to find specific bills if needed",
          ],
        },
        {
          description: "Select a bill to process",
          details: [
            "Click on a bill from the list to view its details",
            "Review the bill items and total amount",
          ],
        },
        {
          description: "Add payments to the bill",
          details: [
            "Click 'Add Payment' or 'Process Payment' button",
            "Select payment method: Cash, M-Pesa, or both",
            "Enter payment amounts",
            "For M-Pesa payments, enter the transaction reference",
            "Click 'Add Payment' to record the payment",
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
        { description: "Bills are in submitted or reopened status" },
      ],
      steps: [
        {
          description: "Navigate to Bills Management > Void Requests",
          details: [
            "Click on 'Bills Management' in the sidebar menu",
            "Select 'Void Requests' from the submenu",
          ],
        },
        {
          description: "View pending void requests",
          details: [
            "All pending void requests will be displayed",
            "Each request shows the bill, item, reason, and requesting user",
          ],
        },
        {
          description: "Review the void request",
          details: [
            "Click on a void request to view details",
            "Review the item to be voided and the reason provided",
            "Verify the bill status allows voiding",
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
        { description: "Bills exist in submitted status with payment discrepancies" },
        { description: "There are actual issues that need fixing (payment problems, incorrect items, etc.)" },
      ],
      steps: [
        {
          description: "Navigate to Bills Management > Process Bills",
          details: [
            "Click on 'Bills Management' in the sidebar menu",
            "Select 'Process Bills' from the submenu",
          ],
        },
        {
          description: "Select a bill with issues",
          details: [
            "Find a bill in 'submitted' status that has payment discrepancies or other issues",
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
            "Common reasons: payment discrepancy, incorrect items, customer request",
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
      title: "Manage Menu Categories",
      icon: "bi-grid",
      prerequisites: [],
      steps: [
        {
          description: "Navigate to Menu & Pricing > Categories",
          details: [
            "Click on 'Menu & Pricing' in the sidebar menu",
            "Select 'Categories' from the submenu",
          ],
        },
        {
          description: "Add a new category",
          details: [
            "Enter category name in the form at the top",
            "Click 'Add Category' or 'Submit' button",
            "The category will appear in the categories list",
          ],
        },
        {
          description: "Edit an existing category",
          details: [
            "Select a category from the list",
            "Click 'Edit' or modify the category name",
            "Save the changes",
          ],
        },
        {
          description: "Delete a category (if needed)",
          details: [
            "Select a category from the list",
            "Click 'Delete' button",
            "Confirm the deletion",
            "Note: Categories with items cannot be deleted",
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
            "Click on 'Menu & Pricing' in the sidebar menu",
            "Select 'Pricelists' from the submenu",
          ],
        },
        {
          description: "Create a new pricelist",
          details: [
            "Click 'Add Pricelist' button",
            "Enter pricelist name and description",
            "Set status to 'Active' if it should be immediately available",
            "Click 'Save' to create the pricelist",
          ],
        },
        {
          description: "Add items to pricelist",
          details: [
            "Select the pricelist from the list",
            "Click 'Add Items' or use the item management interface",
            "Select items and set their prices",
            "Save the item prices",
          ],
        },
        {
          description: "Edit pricelist details",
          details: [
            "Select a pricelist from the list",
            "Click 'Edit' to modify name, description, or status",
            "Save the changes",
          ],
        },
        {
          description: "Link pricelist to station",
          details: [
            "Navigate to Stations > Overview",
            "Select a station",
            "Link the pricelist to the station",
          ],
        },
      ],
    },
    {
      title: "View Reports",
      icon: "bi-bar-chart",
      prerequisites: [
        { description: "Bills and transactions exist in the system" },
      ],
      steps: [
        {
          description: "Navigate to Reports",
          details: [
            "Click on 'Reports' in the sidebar menu",
            "Select the type of report you want to view",
          ],
        },
        {
          description: "Select report type",
          details: [
            "Sales Revenue: View sales revenue reports",
            "Items Sold Count: View items sold statistics",
            "Voided Items: View voided items report",
            "Expenditure: View expenditure reports",
            "Production/Sales Reconciliation: View reconciliation reports",
            "Other available reports as needed",
          ],
        },
        {
          description: "Set date range",
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
            Supervisor User Documentation
          </h1>
          <p className="mb-0">
            Step-by-step guides for common supervisor tasks in the POS system
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
              This documentation provides detailed user journeys for supervisor tasks.
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
                    <a href="/supervisor/void-requests" className="text-decoration-none">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Void Requests
                    </a>
                  </li>
                  <li className="mb-2">
                    <a href="/supervisor/reopened-bills" className="text-decoration-none">
                      <i className="bi bi-arrow-clockwise me-2"></i>
                      Reopened Bills
                    </a>
                  </li>
                </ul>
              </Col>
              <Col md={6}>
                <ul className="list-unstyled">
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

