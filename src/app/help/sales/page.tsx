"use client";

import React from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
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
        { description: "Station is selected (use station switcher if needed)" },
        { description: "Pricelist is available for your station" },
        { description: "Menu categories and items exist" },
      ],
      steps: [
        {
          description: "Navigate to Bill",
          details: [
            "Click on 'Bill' in the sidebar menu",
            "You will see the billing interface",
          ],
        },
        {
          description: "Select a category",
          details: [
            "Browse categories on the left side",
            "Click on a category to view its items",
          ],
        },
        {
          description: "Add items to the bill",
          details: [
            "Click on items from the selected category",
            "Items will be added to the bill on the right side",
            "You can add multiple items from different categories",
          ],
        },
        {
          description: "Set quantities",
          details: [
            "For each item, adjust the quantity using + and - buttons",
            "Or enter quantity directly in the quantity field",
            "The subtotal will update automatically",
          ],
        },
        {
          description: "Review the bill",
          details: [
            "Check all items and quantities are correct",
            "Review the total amount",
            "Remove items if needed by clicking the remove button",
          ],
        },
        {
          description: "Save the bill",
          details: [
            "Click 'Save Bill' or 'Submit' button",
            "The bill will be saved with 'pending' status",
            "You can submit it later from 'My Sales'",
          ],
        },
      ],
    },
    {
      title: "Submit Bills for Processing",
      icon: "bi-send",
      prerequisites: [
        { description: "Bills exist in pending status" },
        { description: "Bills were created by you" },
      ],
      steps: [
        {
          description: "Navigate to My Sales",
          details: [
            "Click on 'My Sales' in the sidebar menu",
            "You will see all your bills",
          ],
        },
        {
          description: "View pending bills",
          details: [
            "Bills with 'pending' status will be displayed",
            "You can filter bills by status if needed",
          ],
        },
        {
          description: "Select bills to submit",
          details: [
            "Check the boxes next to bills you want to submit",
            "Or select a single bill by clicking on it",
          ],
        },
        {
          description: "Add payment information",
          details: [
            "Click 'Submit' button",
            "Select payment method: Cash, M-Pesa, or both",
            "Enter payment amounts",
            "For M-Pesa payments, enter the transaction reference",
          ],
        },
        {
          description: "Confirm submission",
          details: [
            "Review the payment details",
            "Click 'Submit Bill' to confirm",
            "The bill status will change to 'submitted'",
            "Cashier can now process the payment",
          ],
        },
      ],
    },
    {
      title: "Request Item Void",
      icon: "bi-x-circle",
      prerequisites: [
        { description: "Bill exists in submitted or reopened status" },
        { description: "Item is in active status (not already voided)" },
      ],
      steps: [
        {
          description: "Navigate to My Sales",
          details: [
            "Click on 'My Sales' in the sidebar menu",
            "View your submitted bills",
          ],
        },
        {
          description: "Select a bill with submitted status",
          details: [
            "Find a bill that is 'submitted' or 'reopened'",
            "Click on the bill to view its details",
          ],
        },
        {
          description: "Request void for an item",
          details: [
            "Find the item you want to void in the bill",
            "Click 'Void Request' button next to the item",
            "Enter a reason for voiding the item",
            "Click 'Submit Void Request'",
          ],
        },
        {
          description: "Wait for approval",
          details: [
            "The item status will change to 'void_pending'",
            "Cashier or supervisor will review and approve/reject",
            "You will see the status update once approved",
          ],
        },
      ],
    },
    {
      title: "Resubmit Reopened Bills",
      icon: "bi-arrow-repeat",
      prerequisites: [
        { description: "Bill exists in reopened status" },
        { description: "Issues have been fixed (payment discrepancies, incorrect items, etc.)" },
      ],
      steps: [
        {
          description: "Navigate to My Sales",
          details: [
            "Click on 'My Sales' in the sidebar menu",
            "Filter or search for reopened bills",
          ],
        },
        {
          description: "Select a reopened bill",
          details: [
            "Find bills with 'reopened' status",
            "Click on a reopened bill to view its details",
            "Review the reopen reason",
          ],
        },
        {
          description: "Make necessary corrections",
          details: [
            "Fix payment discrepancies if needed",
            "Correct any incorrect items or quantities",
            "Add missing items if required",
            "Remove incorrect items if needed",
          ],
        },
        {
          description: "Add payment if needed",
          details: [
            "If payment was the issue, add the correct payment",
            "Select payment method and enter amounts",
            "For M-Pesa, enter transaction reference",
          ],
        },
        {
          description: "Resubmit the bill",
          details: [
            "Click 'Resubmit Bill' button",
            "Confirm the resubmission",
            "The bill status will change back to 'submitted'",
            "Cashier can now process it again",
          ],
        },
      ],
    },
    {
      title: "View Pricelist Catalog",
      icon: "bi-book",
      prerequisites: [
        { description: "Pricelist is linked to your station" },
      ],
      steps: [
        {
          description: "Navigate to Pricelist Catalog",
          details: [
            "Click on 'Pricelist Catalog' in the sidebar menu",
            "You will see items available for your current pricelist",
          ],
        },
        {
          description: "Browse items by category",
          details: [
            "Select a category from the list",
            "View all items in that category with their prices",
          ],
        },
        {
          description: "Search for items",
          details: [
            "Use the search bar to find specific items",
            "Search by item name or description",
          ],
        },
        {
          description: "View item details",
          details: [
            "Click on an item to see more details",
            "View price, description, and availability",
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
            Sales User Documentation
          </h1>
          <p className="mb-0">
            Step-by-step guides for common sales tasks in the POS system
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
              This documentation provides detailed user journeys for sales tasks.
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
  );
}

