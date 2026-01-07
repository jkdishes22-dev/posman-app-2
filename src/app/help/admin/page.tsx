"use client";

import React from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import UserJourney from "../../components/UserJourney";
import { Container, Row, Col, Card, Accordion } from "react-bootstrap";
import { useTooltips } from "../../hooks/useTooltips";

export default function AdminHelpPage() {
    useTooltips();

    const journeys = [
        {
            title: "Create a Sales User",
            icon: "bi-person-plus",
            prerequisites: [
                { description: "Sales role exists with appropriate permissions" },
                { description: "At least one station has been created" },
                { description: "Menu categories have been created" },
                { description: "At least one pricelist has been created" },
                { description: "Pricelist is linked to the station where the user will work" },
            ],
            steps: [
                {
                    description: "Navigate to Users > View Users",
                    details: [
                        "Click on 'Users' in the sidebar menu",
                        "Select 'View Users' from the submenu",
                    ],
                },
                {
                    description: "Click the 'Add User' button",
                    details: [
                        "The button is typically located at the top right of the users list",
                    ],
                },
                {
                    description: "Fill in user details",
                    details: [
                        "Enter First Name",
                        "Enter Last Name",
                        "Enter Username (must be unique)",
                        "Enter Password",
                        "Confirm Password",
                        "Select 'sales' role from the role dropdown",
                    ],
                },
                {
                    description: "Click 'Save' to create the user",
                    details: [
                        "The user will be created and added to the users list",
                    ],
                },
                {
                    description: "Assign user to a station",
                    details: [
                        "Navigate to Stations > Station Users",
                        "Select the newly created user from the list",
                        "Click 'Add Station' button",
                        "Select the station from the dropdown",
                        "Click 'Add' to assign the station",
                        "Optionally set this station as default for the user",
                    ],
                },
            ],
        },
        {
            title: "Create a Station",
            icon: "bi-building",
            prerequisites: [],
            steps: [
                {
                    description: "Navigate to Stations > Overview",
                    details: [
                        "Click on 'Stations' in the sidebar menu",
                        "Select 'Overview' from the submenu",
                    ],
                },
                {
                    description: "Click the 'Add Station' button",
                    details: [
                        "The button is typically located at the top right of the stations list",
                    ],
                },
                {
                    description: "Fill in station details",
                    details: [
                        "Enter Station Name (e.g., 'Main Counter', 'Drive-Through')",
                        "Enter Description (optional)",
                        "Set Status to 'Active' if the station should be immediately available",
                    ],
                },
                {
                    description: "Click 'Save' to create the station",
                    details: [
                        "The station will be created and added to the stations list",
                    ],
                },
            ],
        },
        {
            title: "Create a Category",
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
                    description: "Enter category name in the form",
                    details: [
                        "The form is typically located at the top of the categories list",
                        "Enter a descriptive name (e.g., 'Beverages', 'Main Course', 'Desserts')",
                    ],
                },
                {
                    description: "Click 'Add Category' or 'Submit' button",
                    details: [
                        "The category will be created and appear in the categories list",
                    ],
                },
                {
                    description: "Verify the category appears in the list",
                    details: [
                        "You can now add menu items to this category",
                    ],
                },
            ],
        },
        {
            title: "Create a Pricelist",
            icon: "bi-tags",
            prerequisites: [
                { description: "At least one category exists" },
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
                    description: "Click the 'Add Pricelist' button",
                    details: [
                        "The button is typically located at the top right of the pricelists list",
                    ],
                },
                {
                    description: "Fill in pricelist details",
                    details: [
                        "Enter Pricelist Name (e.g., 'Standard Pricing', 'VIP Pricing')",
                        "Enter Description (optional)",
                        "Set Status to 'Active' if the pricelist should be immediately available",
                        "Optionally set as default pricelist",
                    ],
                },
                {
                    description: "Click 'Save' to create the pricelist",
                    details: [
                        "The pricelist will be created and added to the pricelists list",
                    ],
                },
                {
                    description: "Add items to the pricelist",
                    details: [
                        "Select the pricelist from the list",
                        "Click 'Add Items' or use the item management interface",
                        "Select items and set their prices",
                        "Save the item prices",
                    ],
                },
            ],
        },
        {
            title: "Link Pricelist to Station",
            icon: "bi-link-45deg",
            prerequisites: [
                { description: "Station exists" },
                { description: "Pricelist exists" },
            ],
            steps: [
                {
                    description: "Navigate to Stations > Overview",
                    details: [
                        "Click on 'Stations' in the sidebar menu",
                        "Select 'Overview' from the submenu",
                    ],
                },
                {
                    description: "Select the station from the list",
                    details: [
                        "Click on the station you want to link a pricelist to",
                    ],
                },
                {
                    description: "Find the pricelist management section",
                    details: [
                        "Look for 'Pricelists' or 'Linked Pricelists' section in the station details",
                    ],
                },
                {
                    description: "Click 'Link Pricelist' or 'Add Pricelist' button",
                    details: [
                        "Select the pricelist from the dropdown",
                        "Optionally set as default pricelist for this station",
                        "Add notes if needed (optional)",
                    ],
                },
                {
                    description: "Click 'Save' or 'Link' to complete the linking",
                    details: [
                        "The pricelist will now be available to users assigned to this station",
                    ],
                },
            ],
        },
        {
            title: "Manage User Permissions",
            icon: "bi-shield-check",
            prerequisites: [
                { description: "Roles exist in the system" },
                { description: "Permissions exist in the system" },
            ],
            steps: [
                {
                    description: "Navigate to Users > Roles & Permissions",
                    details: [
                        "Click on 'Users' in the sidebar menu",
                        "Select 'Roles & Permissions' from the submenu",
                    ],
                },
                {
                    description: "Select the role you want to manage",
                    details: [
                        "Click on a role from the roles list (e.g., 'sales', 'cashier', 'supervisor')",
                    ],
                },
                {
                    description: "View current permissions",
                    details: [
                        "The role's current permissions will be displayed",
                    ],
                },
                {
                    description: "Add permissions to the role",
                    details: [
                        "Select permissions from the available permissions list",
                        "Click 'Add Permission' or use checkboxes to assign permissions",
                        "Common permissions for sales role include: can_add_bill, can_edit_bill, can_view_bill, etc.",
                    ],
                },
                {
                    description: "Remove permissions if needed",
                    details: [
                        "Uncheck permissions you want to remove",
                        "Click 'Save' or 'Update' to apply changes",
                    ],
                },
                {
                    description: "Verify changes",
                    details: [
                        "Confirm the permissions list reflects your changes",
                        "Users with this role will immediately have the updated permissions",
                    ],
                },
            ],
        },
        {
            title: "Create Production Issue",
            icon: "bi-box-seam",
            prerequisites: [
                { description: "Items exist in the system" },
                { description: "Inventory items are available" },
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
                    description: "Click 'Create Production Issue' or 'New Issue' button",
                    details: [
                        "The button is typically located at the top right",
                    ],
                },
                {
                    description: "Select items to issue",
                    details: [
                        "Search or browse available items",
                        "Select items that need to be issued for production",
                        "Enter quantities for each item",
                    ],
                },
                {
                    description: "Review the production issue",
                    details: [
                        "Verify all items and quantities are correct",
                        "Check that inventory levels are sufficient",
                    ],
                },
                {
                    description: "Submit the production issue",
                    details: [
                        "Click 'Submit' or 'Issue' button",
                        "The inventory will be deducted and production record created",
                    ],
                },
            ],
        },
        {
            title: "View and Manage Bills",
            icon: "bi-receipt",
            prerequisites: [
                { description: "Bills exist in the system" },
            ],
            steps: [
                {
                    description: "Navigate to Bill",
                    details: [
                        "Click on 'Bill' in the sidebar menu",
                    ],
                },
                {
                    description: "View bills list",
                    details: [
                        "Bills are displayed with their status (pending, submitted, closed, etc.)",
                        "Use filters to find specific bills",
                    ],
                },
                {
                    description: "View bill details",
                    details: [
                        "Click on a bill to view its details",
                        "View items, payments, and status information",
                    ],
                },
                {
                    description: "Take actions on bills (if needed)",
                    details: [
                        "As admin, you have read-only access to bills",
                        "You can view bills to help troubleshoot issues",
                        "For processing bills, refer to supervisor or cashier roles",
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
                        Admin User Documentation
                    </h1>
                    <p className="mb-0">
                        Step-by-step guides for common administrative tasks in the POS system
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
                            This documentation provides detailed user journeys for administrative tasks.
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
                                        <a href="/admin/users/view" className="text-decoration-none">
                                            <i className="bi bi-people me-2"></i>
                                            View Users
                                        </a>
                                    </li>
                                    <li className="mb-2">
                                        <a href="/admin/station" className="text-decoration-none">
                                            <i className="bi bi-building me-2"></i>
                                            Manage Stations
                                        </a>
                                    </li>
                                    <li className="mb-2">
                                        <a href="/admin/menu/category" className="text-decoration-none">
                                            <i className="bi bi-grid me-2"></i>
                                            Manage Categories
                                        </a>
                                    </li>
                                </ul>
                            </Col>
                            <Col md={6}>
                                <ul className="list-unstyled">
                                    <li className="mb-2">
                                        <a href="/admin/menu/pricelist" className="text-decoration-none">
                                            <i className="bi bi-tags me-2"></i>
                                            Manage Pricelists
                                        </a>
                                    </li>
                                    <li className="mb-2">
                                        <a href="/admin/production" className="text-decoration-none">
                                            <i className="bi bi-box-seam me-2"></i>
                                            Production Management
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

