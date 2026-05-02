"use client";

import React from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import SecureRoute from "../../components/SecureRoute";
import UserJourney from "../../components/UserJourney";
import { Container, Row, Col, Card, Accordion } from "react-bootstrap";
import { useTooltips } from "../../hooks/useTooltips";

export default function SalesHelpPage() {
  useTooltips();

  const journeys = [
    {
      title: "Create a Bill",
      icon: "bi-cart-plus",
      prerequisites: [
        { description: "A station is selected (use the station switcher in the top nav if needed)" },
        { description: "A pricelist is linked to your station" },
        { description: "Menu categories and items exist" },
      ],
      steps: [
        {
          description: "Navigate to Bill in the sidebar",
          details: [
            "Click on 'Bill' in the sidebar menu to open the billing interface",
          ],
        },
        {
          description: "Select a category and add items",
          details: [
            "Browse categories on the left panel",
            "Click a category to view its items",
            "Click an item to add it to the bill on the right",
            "Tip: use the Express Item Search button (magnifying glass icon) to quickly find items across all categories",
          ],
        },
        {
          description: "Set quantities",
          details: [
            "Adjust quantity using the + and – buttons next to each item",
            "Or type a quantity directly in the quantity field",
            "The subtotal updates automatically",
          ],
        },
        {
          description: "Review and save the bill",
          details: [
            "Confirm all items and quantities are correct",
            "Remove items by clicking the remove button next to them",
            "Click 'Save Bill' — the bill is saved with 'pending' status",
            "You can submit it later from My Sales",
          ],
        },
      ],
    },
    {
      title: "Submit Bills for Processing",
      icon: "bi-send",
      prerequisites: [
        { description: "One or more bills exist in 'pending' status under your account" },
      ],
      steps: [
        {
          description: "Navigate to My Sales",
          details: [
            "Click on 'My Sales' in the sidebar menu",
          ],
        },
        {
          description: "Select the bill(s) to submit",
          details: [
            "Check the boxes next to the bills you want to submit",
            "Or click a single bill to open it",
          ],
        },
        {
          description: "Enter payment information in the submit modal",
          details: [
            "Click 'Submit' to open the payment modal (3 steps: select → review → result)",
            "Step 1 — Select payment method: Cash, M-Pesa, or both; enter amounts",
            "For M-Pesa payments, enter the transaction reference — references must be unique; duplicates are rejected",
            "Step 2 — Review the payment summary before confirming",
            "Step 3 — Confirm the result; the bill moves to 'submitted' status",
          ],
        },
        {
          description: "Bill is now with the Cashier or Supervisor",
          details: [
            "They will process the payment and close the bill",
          ],
        },
      ],
    },
    {
      title: "Request Item Void",
      icon: "bi-x-circle",
      prerequisites: [
        { description: "The bill is in 'submitted' or 'reopened' status" },
        { description: "The item has not already been voided" },
      ],
      steps: [
        {
          description: "Navigate to My Sales and open the submitted bill",
          details: [
            "Click on 'My Sales' in the sidebar",
            "Find the bill (filter by 'submitted' or 'reopened' status if needed)",
            "Click the bill to open its details",
          ],
        },
        {
          description: "Request a void for an item",
          details: [
            "Find the item you want to void in the bill",
            "Click 'Void Request' next to the item",
            "Enter a clear reason for voiding (e.g., 'customer changed order')",
            "Click 'Submit Void Request'",
          ],
        },
        {
          description: "Wait for Supervisor approval",
          details: [
            "The item status changes to 'void_pending'",
            "A Supervisor will review and approve or reject the request",
            "You will see the status update once a decision is made",
          ],
        },
      ],
    },
    {
      title: "Request a Quantity Change",
      icon: "bi-pencil-square",
      prerequisites: [
        { description: "The bill is in 'submitted' status" },
        { description: "The item you want to change has not been voided" },
      ],
      steps: [
        {
          description: "Navigate to My Sales and open the submitted bill",
          details: [
            "Click on 'My Sales' in the sidebar",
            "Find a bill in 'submitted' status and click to open it",
          ],
        },
        {
          description: "Click 'Request Quantity Change' next to the item",
          details: [
            "Enter the new quantity you need",
            "Enter a reason for the change",
            "Click 'Submit' to send the request",
          ],
        },
        {
          description: "Wait for Supervisor approval",
          details: [
            "The request is sent to a Supervisor for review",
            "If approved, the item quantity on the bill is updated automatically",
            "If rejected, the original quantity remains unchanged",
          ],
        },
      ],
    },
    {
      title: "Resubmit Reopened Bills",
      icon: "bi-arrow-repeat",
      prerequisites: [
        { description: "A bill is in 'reopened' status (returned by Cashier or Supervisor)" },
        { description: "You have reviewed the reopen reason and are ready to correct the issue" },
      ],
      steps: [
        {
          description: "Navigate to My Sales and find the reopened bill",
          details: [
            "Click on 'My Sales' in the sidebar",
            "Filter by 'reopened' status if needed",
            "Click the bill and read the reopen reason provided",
          ],
        },
        {
          description: "Make the necessary corrections",
          details: [
            "Fix payment discrepancies, incorrect items, or quantities as described in the reopen reason",
            "Add or remove items if needed",
          ],
        },
        {
          description: "Add corrected payment if required",
          details: [
            "Select the correct payment method and enter the right amount",
            "For M-Pesa, provide the correct and unique transaction reference",
          ],
        },
        {
          description: "Resubmit the bill",
          details: [
            "Click 'Resubmit Bill' and confirm",
            "The bill returns to 'submitted' status for the Cashier or Supervisor to process",
          ],
        },
      ],
    },
    {
      title: "Switch Pricelist at Your Station",
      icon: "bi-tags",
      prerequisites: [
        { description: "Multiple pricelists are linked to your station" },
      ],
      steps: [
        {
          description: "Open the billing interface",
          details: [
            "Click on 'Bill' in the sidebar menu",
          ],
        },
        {
          description: "Locate the pricelist switcher",
          details: [
            "The pricelist switcher appears in the top area of the billing interface",
            "It shows the currently active pricelist name",
          ],
        },
        {
          description: "Select a different pricelist",
          details: [
            "Click the switcher and choose the pricelist for the current customer or event",
            "Item prices in the bill will update immediately to reflect the selected pricelist",
          ],
        },
      ],
    },
    {
      title: "View Pricelist Catalog",
      icon: "bi-book",
      prerequisites: [
        { description: "A pricelist is linked to your station" },
      ],
      steps: [
        {
          description: "Navigate to Pricelist Catalog in the sidebar",
          details: [
            "Click 'Pricelist Catalog' to see all items available under your current pricelist",
          ],
        },
        {
          description: "Browse by category or search",
          details: [
            "Select a category to view its items and prices",
            "Use the search bar to find a specific item by name",
          ],
        },
        {
          description: "View item details",
          details: [
            "Click on an item to see its price, description, and availability",
          ],
        },
      ],
    },
  ];

  return (
    <SecureRoute roleRequired="sales">
    <RoleAwareLayout>
      <Container fluid className="py-4">
        {/* Header */}
        <div className="bg-primary text-white p-4 mb-4 rounded">
          <h1 className="h3 mb-2">
            <i className="bi bi-question-circle me-2"></i>
            Sales User Documentation
          </h1>
          <p className="mb-0">
            Step-by-step guides for sales tasks in the POS system
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
              As a Sales user, your job is to create bills and submit them for payment processing.
              Bills flow from you (pending) → Cashier or Supervisor (submitted) → closed. Understand
              the void and quantity change workflows so you can handle corrections without unnecessary
              bill reopening.
            </p>
            <p className="mb-0">
              <strong>Tip:</strong> M-Pesa transaction references must be unique — you cannot reuse a
              reference that has already been recorded on another bill.
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
                    <a href="/home/billing" className="text-decoration-none">
                      <i className="bi bi-cart me-2"></i>
                      Create Bill
                    </a>
                  </li>
                  <li className="mb-2">
                    <a href="/home/my-sales" className="text-decoration-none">
                      <i className="bi bi-receipt me-2"></i>
                      My Sales
                    </a>
                  </li>
                </ul>
              </Col>
              <Col md={6}>
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <a href="/home/pricelist-catalog" className="text-decoration-none">
                      <i className="bi bi-book me-2"></i>
                      Pricelist Catalog
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
