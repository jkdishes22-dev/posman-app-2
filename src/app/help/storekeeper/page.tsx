"use client";

import React from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import PageHeaderStrip from "../../components/PageHeaderStrip";
import SecureRoute from "../../components/SecureRoute";
import UserJourney from "../../components/UserJourney";
import { Container, Row, Col, Card, Accordion } from "react-bootstrap";
import { useTooltips } from "../../hooks/useTooltips";

export default function StorekeeperHelpPage() {
  useTooltips();

  const journeys = [
    {
      title: "Issue Production",
      icon: "bi-box-seam",
      prerequisites: [
        { description: "Production items (leaf/component items) exist in the system" },
        { description: "Inventory levels are sufficient for the items to be issued" },
      ],
      steps: [
        {
          description: "Navigate to Production > Issue Production",
          details: [
            "Click on 'Production' in the sidebar menu",
            "Select 'Issue Production' from the submenu",
          ],
        },
        {
          description: "Search for the item to issue",
          details: [
            "Use the search bar to find an item by name or code",
            "Important: grouped or composite items cannot be issued directly — only leaf (component) items are eligible",
            "If you see a 'grouped item' error, issue the component items individually instead",
          ],
        },
        {
          description: "Enter production details",
          details: [
            "Review the current inventory level shown for the item",
            "Enter the quantity produced",
            "Add notes if needed",
          ],
        },
        {
          description: "Submit the production issue",
          details: [
            "Click 'Issue Production' to confirm",
            "The production is recorded and inventory is updated automatically",
          ],
        },
        {
          description: "Verify the issue",
          details: [
            "Check that inventory levels reflect the new production",
            "View Production History to confirm the record was created",
          ],
        },
      ],
    },
    {
      title: "Manage Inventory",
      icon: "bi-boxes",
      prerequisites: [
        { description: "Items exist in the system" },
      ],
      steps: [
        {
          description: "Navigate to Inventory > Inventory List",
          details: [
            "Click on 'Inventory' in the sidebar menu",
            "Select 'Inventory List' from the submenu",
          ],
        },
        {
          description: "Review stock levels",
          details: [
            "All inventory items are shown with current quantities",
            "Low-stock alerts are highlighted — take action on these first",
            "Use search or category filters to narrow the list",
          ],
        },
        {
          description: "Adjust inventory if needed",
          details: [
            "Select an item and click 'Adjust'",
            "Note: adjusting inventory requires the CAN_ADJUST_INVENTORY permission — if the Adjust button is missing, contact your admin",
            "Enter the adjustment amount and add a note explaining the reason",
            "Save the change",
          ],
        },
        {
          description: "Monitor the inventory dashboard",
          details: [
            "Navigate to Inventory > Overview for key metrics",
            "View total items, low-stock count, and recent transactions",
            "Act on items that need restocking or investigation",
          ],
        },
      ],
    },
    {
      title: "Create Purchase Order",
      icon: "bi-cart-plus",
      prerequisites: [
        { description: "At least one supplier exists in the system" },
        { description: "Items exist in the system" },
      ],
      steps: [
        {
          description: "Navigate to Suppliers > Purchase Orders",
          details: [
            "Click on 'Suppliers' in the sidebar",
            "Select 'Purchase Orders' from the submenu",
          ],
        },
        {
          description: "Click 'Create Purchase Order'",
          details: [
            "The button is at the top right of the purchase orders list",
          ],
        },
        {
          description: "Select the supplier",
          details: [
            "Choose a supplier from the dropdown",
            "If the supplier does not exist yet, create it first under Suppliers > Suppliers",
          ],
        },
        {
          description: "Add items to the order",
          details: [
            "Search for items by name or code",
            "Enter quantities and unit prices for each item",
            "Review the order total",
          ],
        },
        {
          description: "Add order details and submit",
          details: [
            "Enter the order date and optional expected delivery date",
            "Add any notes or special instructions",
            "Click 'Create' or 'Submit' — the purchase order is created with 'pending' status",
          ],
        },
      ],
    },
    {
      title: "Receive Purchase Order",
      icon: "bi-check-square",
      prerequisites: [
        { description: "A purchase order exists in 'pending' status" },
        { description: "The goods have arrived from the supplier" },
      ],
      steps: [
        {
          description: "Navigate to Suppliers > Purchase Orders",
          details: [
            "Click on 'Suppliers' in the sidebar",
            "Select 'Purchase Orders' from the submenu",
          ],
        },
        {
          description: "Open the pending purchase order",
          details: [
            "Find the order with 'pending' status and click on it",
          ],
        },
        {
          description: "Click 'Receive' or 'Receive Order'",
          details: [
            "This opens the receive dialog",
          ],
        },
        {
          description: "Confirm received quantities",
          details: [
            "Review the ordered quantities for each item",
            "Enter the actual received quantity — adjust if some items are missing or damaged",
            "Add notes for any discrepancies",
          ],
        },
        {
          description: "Complete the receive process",
          details: [
            "Click 'Receive' or 'Confirm'",
            "The purchase order status changes to 'received'",
            "Inventory is updated automatically with the received quantities",
          ],
        },
      ],
    },
    {
      title: "Manage Suppliers",
      icon: "bi-truck",
      prerequisites: [],
      steps: [
        {
          description: "Navigate to Suppliers > Suppliers",
          details: [
            "Click on 'Suppliers' in the sidebar",
            "Select 'Suppliers' from the submenu",
          ],
        },
        {
          description: "Add a new supplier",
          details: [
            "Click 'Add Supplier'",
            "Enter supplier name, phone, email, and address",
            "Add any notes",
            "Click 'Save' to create the supplier",
          ],
        },
        {
          description: "Edit supplier information",
          details: [
            "Select a supplier from the list",
            "Click 'Edit', update the details, and save",
          ],
        },
        {
          description: "View supplier details",
          details: [
            "Click on a supplier to view their purchase order history and payment transactions",
          ],
        },
      ],
    },
    {
      title: "View Supplier Transactions",
      icon: "bi-receipt",
      prerequisites: [
        { description: "Purchase orders have been received from suppliers" },
      ],
      steps: [
        {
          description: "Navigate to Suppliers > Transactions",
          details: [
            "Click on 'Suppliers' in the sidebar",
            "Select 'Transactions' from the submenu",
          ],
        },
        {
          description: "View transaction history",
          details: [
            "All supplier payment transactions are listed with date, amount, and linked purchase order",
          ],
        },
        {
          description: "Filter by date or supplier",
          details: [
            "Use date range filters to narrow results to a specific period",
            "Filter by supplier name to see transactions with a specific supplier",
            "Click 'Apply Filters' to update the list",
          ],
        },
        {
          description: "View transaction details",
          details: [
            "Click on a transaction to see the linked purchase order and any associated notes",
          ],
        },
      ],
    },
    {
      title: "View Inventory Transactions",
      icon: "bi-arrow-left-right",
      prerequisites: [
        { description: "Inventory transactions exist in the system" },
      ],
      steps: [
        {
          description: "Navigate to Inventory > Transactions",
          details: [
            "Click on 'Inventory' in the sidebar",
            "Select 'Transactions' from the submenu",
          ],
        },
        {
          description: "View all inventory movements",
          details: [
            "Transactions show: item, quantity change, type (production, sale, adjustment), date, and user",
          ],
        },
        {
          description: "Filter transactions",
          details: [
            "Filter by date range, item, or transaction type",
            "Click 'Apply Filters' to view filtered results",
          ],
        },
        {
          description: "View transaction details",
          details: [
            "Click on a transaction to see related information (bill ID, production ID, notes)",
          ],
        },
      ],
    },
    {
      title: "View Storekeeper Reports",
      icon: "bi-bar-chart",
      prerequisites: [
        { description: "Sales and production data exist in the system" },
      ],
      steps: [
        {
          description: "Navigate to Reports in the sidebar",
          details: [
            "Click on 'Reports' from the storekeeper sidebar",
          ],
        },
        {
          description: "Select a report type",
          details: [
            "Items Sold Count — breakdown of item sales to reconcile against production",
            "Other available reports as shown in your sidebar",
          ],
        },
        {
          description: "Set date filters and view results",
          details: [
            "Choose a date range",
            "Click 'Generate' or 'View Report' to load the data",
            "Use the results to reconcile production output against actual sales",
          ],
        },
      ],
    },
  ];

  return (
    <SecureRoute roleRequired="storekeeper">
    <RoleAwareLayout>
      <Container fluid className="py-4">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-question-circle me-2" aria-hidden></i>
            Storekeeper User Documentation
          </h1>
          <p className="mb-0 mt-2 small text-white-50">
            Step-by-step guides for storekeeper tasks in the POS system
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
              As a Storekeeper, you manage physical inventory — issuing production, tracking stock
              levels, handling purchase orders, and managing suppliers. Accurate inventory keeps
              sales and production workflows running without interruptions.
            </p>
            <p className="mb-0">
              <strong>Tip:</strong> Only leaf (component) items can be issued in production.
              Grouped or composite items must be broken down to their components first.
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
                    <a href="/storekeeper/production/issue" className="text-decoration-none">
                      <i className="bi bi-box-seam me-2"></i>
                      Issue Production
                    </a>
                  </li>
                  <li className="mb-2">
                    <a href="/storekeeper/stock" className="text-decoration-none">
                      <i className="bi bi-boxes me-2"></i>
                      Inventory List
                    </a>
                  </li>
                  <li className="mb-2">
                    <a href="/storekeeper/inventory/transactions" className="text-decoration-none">
                      <i className="bi bi-arrow-left-right me-2"></i>
                      Inventory Transactions
                    </a>
                  </li>
                </ul>
              </Col>
              <Col md={6}>
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <a href="/storekeeper/suppliers" className="text-decoration-none">
                      <i className="bi bi-truck me-2"></i>
                      Manage Suppliers
                    </a>
                  </li>
                  <li className="mb-2">
                    <a href="/storekeeper/suppliers/transactions" className="text-decoration-none">
                      <i className="bi bi-receipt me-2"></i>
                      Supplier Transactions
                    </a>
                  </li>
                  <li className="mb-2">
                    <a href="/storekeeper/purchase-orders" className="text-decoration-none">
                      <i className="bi bi-cart-check me-2"></i>
                      Purchase Orders
                    </a>
                  </li>
                  <li className="mb-2">
                    <a href="/storekeeper/reports" className="text-decoration-none">
                      <i className="bi bi-bar-chart me-2"></i>
                      Reports
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
