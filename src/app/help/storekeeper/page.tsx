"use client";

import React from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
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
        { description: "Items exist in the system" },
        { description: "Inventory items are available (for composite items)" },
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
          description: "Search for an item",
          details: [
            "Use the search bar to find the item you want to issue",
            "Type item name or code to search",
            "Select the item from the search results",
          ],
        },
        {
          description: "Enter production details",
          details: [
            "View current inventory level for the item",
            "Enter the quantity produced",
            "Add notes if needed (optional)",
          ],
        },
        {
          description: "Submit the production issue",
          details: [
            "Click 'Issue Production' or 'Submit' button",
            "The production will be recorded",
            "Inventory will be updated automatically",
          ],
        },
        {
          description: "Verify the issue",
          details: [
            "Check that inventory levels have been updated",
            "View production history to confirm the issue",
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
          description: "View inventory levels",
          details: [
            "All inventory items are displayed with current levels",
            "View low stock alerts if any",
            "Use filters to find specific items",
          ],
        },
        {
          description: "Search for specific items",
          details: [
            "Use the search bar to find items",
            "Filter by category if needed",
            "View item details and current stock",
          ],
        },
        {
          description: "Adjust inventory if needed",
          details: [
            "Select an item to adjust",
            "Click 'Adjust' or 'Edit' button",
            "Enter new quantity or adjustment amount",
            "Add notes explaining the adjustment",
            "Save the changes",
          ],
        },
        {
          description: "Monitor inventory dashboard",
          details: [
            "Navigate to Inventory > Overview",
            "View key metrics: total items, low stock alerts, recent transactions",
            "Take action on items that need attention",
          ],
        },
      ],
    },
    {
      title: "Create Purchase Order",
      icon: "bi-cart-plus",
      prerequisites: [
        { description: "Suppliers exist in the system" },
        { description: "Items exist in the system" },
      ],
      steps: [
        {
          description: "Navigate to Suppliers > Purchase Orders",
          details: [
            "Click on 'Suppliers' in the sidebar menu",
            "Select 'Purchase Orders' from the submenu",
          ],
        },
        {
          description: "Click 'Create Purchase Order' or 'Add Purchase Order' button",
          details: [
            "The button is typically located at the top right",
          ],
        },
        {
          description: "Select supplier",
          details: [
            "Choose a supplier from the dropdown",
            "If supplier doesn't exist, create it first in Suppliers > Suppliers",
          ],
        },
        {
          description: "Add items to the order",
          details: [
            "Search for items to add",
            "Select items and enter quantities",
            "Enter unit prices for each item",
            "Review the order total",
          ],
        },
        {
          description: "Add order details",
          details: [
            "Enter order date",
            "Add expected delivery date (optional)",
            "Add notes or special instructions (optional)",
          ],
        },
        {
          description: "Submit the purchase order",
          details: [
            "Click 'Create' or 'Submit' button",
            "The purchase order will be created with 'pending' status",
            "You can receive it once goods arrive",
          ],
        },
      ],
    },
    {
      title: "Receive Purchase Order",
      icon: "bi-check-square",
      prerequisites: [
        { description: "Purchase order exists in pending status" },
        { description: "Goods have arrived from supplier" },
      ],
      steps: [
        {
          description: "Navigate to Suppliers > Purchase Orders",
          details: [
            "Click on 'Suppliers' in the sidebar menu",
            "Select 'Purchase Orders' from the submenu",
          ],
        },
        {
          description: "Find the purchase order",
          details: [
            "View purchase orders with 'pending' status",
            "Click on the purchase order you want to receive",
          ],
        },
        {
          description: "Click 'Receive' or 'Receive Order' button",
          details: [
            "The receive button is available for pending orders",
            "Click to open the receive dialog",
          ],
        },
        {
          description: "Confirm received quantities",
          details: [
            "Review the ordered quantities",
            "Enter actual received quantities for each item",
            "Adjust quantities if some items are missing or damaged",
            "Add notes about any discrepancies",
          ],
        },
        {
          description: "Complete the receive process",
          details: [
            "Click 'Receive' or 'Confirm' button",
            "The purchase order status will change to 'received'",
            "Inventory will be updated automatically with received items",
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
            "Click on 'Suppliers' in the sidebar menu",
            "Select 'Suppliers' from the submenu",
          ],
        },
        {
          description: "Add a new supplier",
          details: [
            "Click 'Add Supplier' or 'New Supplier' button",
            "Enter supplier name",
            "Enter contact information (phone, email, address)",
            "Add notes or additional details (optional)",
            "Click 'Save' to create the supplier",
          ],
        },
        {
          description: "Edit supplier information",
          details: [
            "Select a supplier from the list",
            "Click 'Edit' button",
            "Update supplier details",
            "Save the changes",
          ],
        },
        {
          description: "View supplier details",
          details: [
            "Click on a supplier to view full details",
            "View purchase orders from this supplier",
            "View payment history if applicable",
          ],
        },
        {
          description: "Delete supplier (if needed)",
          details: [
            "Select a supplier",
            "Click 'Delete' button",
            "Confirm the deletion",
            "Note: Suppliers with purchase orders may not be deletable",
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
            "Click on 'Inventory' in the sidebar menu",
            "Select 'Transactions' from the submenu",
          ],
        },
        {
          description: "View all transactions",
          details: [
            "All inventory movements are displayed",
            "Transactions show: item, quantity change, type, date, user",
          ],
        },
        {
          description: "Filter transactions",
          details: [
            "Filter by date range using date pickers",
            "Filter by item using search or dropdown",
            "Filter by transaction type (production, sale, adjustment, etc.)",
            "Click 'Apply Filters' to view filtered results",
          ],
        },
        {
          description: "View transaction details",
          details: [
            "Click on a transaction to view full details",
            "See related information (bill ID, production ID, etc.)",
            "View notes or reasons for the transaction",
          ],
        },
        {
          description: "Export transaction data (if available)",
          details: [
            "Use export functionality to download transaction data",
            "Export for reporting or analysis purposes",
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
            Storekeeper User Documentation
          </h1>
          <p className="mb-0">
            Step-by-step guides for common storekeeper tasks in the POS system
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
              This documentation provides detailed user journeys for storekeeper tasks.
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
  );
}

