"use client";

import React from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import SecureRoute from "../../components/SecureRoute";
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
                    description: "Click the 'Add User' button at the top right of the users list",
                    details: [],
                },
                {
                    description: "Fill in user details",
                    details: [
                        "Enter First Name and Last Name",
                        "Enter Username (must be unique across the system)",
                        "Enter Password and Confirm Password",
                        "Select 'sales' role from the role dropdown",
                    ],
                },
                {
                    description: "Click 'Save' to create the user",
                    details: [
                        "The user will appear in the users list immediately",
                    ],
                },
                {
                    description: "Assign the user to a station",
                    details: [
                        "Navigate to Stations > Station Users",
                        "Select the newly created user from the list",
                        "Click 'Add Station' and select the station from the dropdown",
                        "Optionally set this station as the user's default",
                        "Click 'Add' to confirm",
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
                    description: "Click the 'Add Station' button at the top right",
                    details: [],
                },
                {
                    description: "Fill in station details",
                    details: [
                        "Enter Station Name (e.g., 'Main Counter', 'Drive-Through')",
                        "Enter Description (optional)",
                        "Set Status to 'Active' so the station is immediately available",
                    ],
                },
                {
                    description: "Click 'Save' to create the station",
                    details: [
                        "The station will appear in the stations list",
                        "You can now link pricelists and assign users to it",
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
                    description: "Enter the category name in the form at the top of the page",
                    details: [
                        "Use a descriptive name such as 'Beverages', 'Main Course', or 'Desserts'",
                    ],
                },
                {
                    description: "Click 'Add Category' to save",
                    details: [
                        "The category will appear in the list immediately",
                        "You can now add menu items to this category",
                    ],
                },
            ],
        },
        {
            title: "Create Menu Items",
            icon: "bi-cup-hot",
            prerequisites: [
                { description: "At least one menu category exists" },
            ],
            steps: [
                {
                    description: "Navigate to Menu & Pricing > Categories",
                    details: [
                        "Click on 'Menu & Pricing' in the sidebar menu",
                        "Select 'Categories' from the submenu",
                    ],
                },
                {
                    description: "Open the category you want to add items to",
                    details: [
                        "Click the category row to expand its item list",
                    ],
                },
                {
                    description: "Add a new menu item",
                    details: [
                        "Click 'Add Item' or 'New Item' within the category view",
                        "Enter the item name and any required fields (code, description)",
                        "Set status to 'Active' so the item appears in the billing interface",
                        "Click 'Save' to create the item",
                    ],
                },
                {
                    description: "Assign a price in a pricelist",
                    details: [
                        "Navigate to Menu & Pricing > Pricelists",
                        "Open the target pricelist and assign a price for the new item",
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
                    description: "Click the 'Add Pricelist' button at the top right",
                    details: [],
                },
                {
                    description: "Fill in pricelist details",
                    details: [
                        "Enter Pricelist Name (e.g., 'Standard Pricing', 'VIP Pricing')",
                        "Enter Description (optional)",
                        "Set Status to 'Active' if the pricelist should be immediately available",
                        "Optionally mark as the default pricelist",
                    ],
                },
                {
                    description: "Click 'Save' to create the pricelist",
                    details: [],
                },
                {
                    description: "Add items and prices to the pricelist",
                    details: [
                        "Select the pricelist from the list",
                        "Click 'Add Items' and select items from the menu",
                        "Enter the price for each item and save",
                        "Tip: Use the CSV Upload option to import prices in bulk — see the 'Upload Pricelist via CSV' journey below",
                    ],
                },
            ],
        },
        {
            title: "Link Pricelist to Station",
            icon: "bi-link-45deg",
            prerequisites: [
                { description: "A station exists" },
                { description: "A pricelist exists with items and prices configured" },
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
                    description: "Click on the station you want to configure",
                    details: [],
                },
                {
                    description: "Find the 'Linked Pricelists' section in the station details",
                    details: [],
                },
                {
                    description: "Click 'Link Pricelist' or 'Add Pricelist'",
                    details: [
                        "Select the pricelist from the dropdown",
                        "Optionally set it as the default pricelist for this station",
                        "Add notes if needed",
                        "Click 'Save' or 'Link' to confirm",
                    ],
                },
                {
                    description: "Verify the link",
                    details: [
                        "The pricelist will now appear in the station's linked pricelists list",
                        "Sales users assigned to this station will be able to select this pricelist when creating bills",
                    ],
                },
            ],
        },
        {
            title: "Manage User Permissions",
            icon: "bi-shield-check",
            prerequisites: [
                { description: "Roles exist in the system (admin, sales, cashier, supervisor, storekeeper)" },
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
                        "Click a role from the list (e.g., 'sales', 'cashier', 'supervisor')",
                    ],
                },
                {
                    description: "Add or remove permissions",
                    details: [
                        "Select permissions from the available permissions list to add them",
                        "Uncheck permissions you want to remove",
                        "Common sales permissions: can_add_bill, can_edit_bill, can_view_bill",
                        "Click 'Save' or 'Update' to apply changes",
                    ],
                },
                {
                    description: "Verify the changes",
                    details: [
                        "Changes take effect immediately — users with this role will have updated access on their next action",
                    ],
                },
            ],
        },
        {
            title: "Upload Pricelist via CSV",
            icon: "bi-file-earmark-spreadsheet",
            prerequisites: [
                { description: "A pricelist has been created" },
                { description: "Menu items exist in the system" },
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
                    description: "Open the target pricelist and click 'Upload Items'",
                    details: [
                        "The upload modal opens with a 3-step workflow: Select → Review → Result",
                    ],
                },
                {
                    description: "Download the CSV template",
                    details: [
                        "Click 'Download Template' to get a pre-filled CSV with the correct headers and example rows",
                        "Open the file in a spreadsheet application",
                        "Fill in prices for each item — do not add or remove columns",
                    ],
                },
                {
                    description: "Upload the completed CSV",
                    details: [
                        "Click 'Select File' and choose your completed CSV",
                        "The system will validate all rows before applying any changes",
                        "Important: uploads are all-or-nothing — if any row has an error, the entire upload is rejected",
                    ],
                },
                {
                    description: "Review the result",
                    details: [
                        "If successful, the items and prices are saved immediately",
                        "If there are errors, row-level details are shown (row number, field, problem)",
                        "Click 'Back' to fix your CSV and re-upload — previously saved prices are not affected",
                    ],
                },
            ],
        },
        {
            title: "Manage License",
            icon: "bi-patch-check",
            prerequisites: [
                { description: "Application is installed and a license code has been provided" },
            ],
            steps: [
                {
                    description: "Navigate to Admin > License",
                    details: [
                        "Click on 'License' in the admin sidebar menu",
                    ],
                },
                {
                    description: "Review license status",
                    details: [
                        "Check the expiration date, plan type, and validation health indicators",
                        "A green status means the license is active and valid",
                        "A red or warning status means action is required",
                    ],
                },
                {
                    description: "Run diagnostics if there are issues",
                    details: [
                        "Click 'Run Diagnostics' to check the license binding and machine fingerprint",
                        "Diagnostics output will indicate whether the issue is with the code, the machine, or the activation state",
                    ],
                },
                {
                    description: "Activate or re-activate if needed",
                    details: [
                        "Enter the license code in the activation field",
                        "Click 'Activate' — the license is bound to this machine",
                        "Activation is offline; no internet connection is required",
                        "Contact support if activation fails after diagnostics",
                    ],
                },
            ],
        },
        {
            title: "Back Up the Database",
            icon: "bi-database",
            prerequisites: [
                { description: "You are logged in as Admin" },
            ],
            steps: [
                {
                    description: "Navigate to Admin > Settings",
                    details: [
                        "Click on 'Settings' in the admin sidebar menu",
                    ],
                },
                {
                    description: "Find the 'Backup Database' button and click it",
                    details: [
                        "A confirmation prompt will appear",
                    ],
                },
                {
                    description: "Confirm the backup",
                    details: [
                        "Click 'Confirm' to start the backup",
                        "The backup file is saved automatically to the userData/backups/ folder on this machine",
                        "A success message will confirm the backup completed",
                    ],
                },
                {
                    description: "Note on automatic backups",
                    details: [
                        "The system also runs an automatic daily backup without any manual action",
                        "Manual backup is recommended before major configuration changes (e.g., bulk pricelist updates, role changes)",
                    ],
                },
            ],
        },
        {
            title: "Create Production Issue",
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
                        "Use the search bar to find the item by name or code",
                        "Note: grouped/composite items cannot be issued directly — only leaf (component) items are eligible",
                    ],
                },
                {
                    description: "Enter production details",
                    details: [
                        "Review the current inventory level shown for the item",
                        "Enter the quantity to issue",
                        "Add notes if needed",
                    ],
                },
                {
                    description: "Submit the production issue",
                    details: [
                        "Click 'Issue Production' to confirm",
                        "Inventory will be updated automatically and a production record will be created",
                    ],
                },
            ],
        },
        {
            title: "View Inventory & Monitor Stock",
            icon: "bi-boxes",
            prerequisites: [
                { description: "Inventory and item master data exist in the system" },
            ],
            steps: [
                {
                    description: "Navigate to Inventory > Inventory List",
                    details: [
                        "Click 'Inventory' in the sidebar menu",
                        "Select 'Inventory List'",
                    ],
                },
                {
                    description: "Review current stock levels",
                    details: [
                        "Items are listed with current quantities and low-stock alerts",
                        "Sort or filter to find items below minimum stock",
                    ],
                },
                {
                    description: "Coordinate with storekeeper for adjustments",
                    details: [
                        "Admins have read-only inventory access by default",
                        "For stock adjustments or purchase orders, the Storekeeper role handles those workflows",
                    ],
                },
            ],
        },
        {
            title: "View Reports & Analytics",
            icon: "bi-graph-up",
            prerequisites: [
                { description: "Operational data exists (bills, production, inventory)" },
            ],
            steps: [
                {
                    description: "Navigate to Reports & Analytics",
                    details: [
                        "Click on 'Reports & Analytics' in the sidebar",
                    ],
                },
                {
                    description: "Choose a report",
                    details: [
                        "Sales Revenue — total revenue over a period",
                        "Profit & Loss (P&L) — revenue vs. cost analysis",
                        "Items Sold Count — breakdown of item sales by user",
                        "Voided Items — summary of all voided bill items",
                        "Production-Sales Reconciliation — compare production output vs. sales",
                        "Production Stock Revenue — stock value from production",
                        "Expenditure — cost tracking report",
                        "Invoices & Pending Bills — outstanding bills report",
                        "Purchase Orders — supplier order history",
                    ],
                },
                {
                    description: "Set filters and run the report",
                    details: [
                        "Select the date range and any other filters shown",
                        "Click 'Run', 'Apply', or 'Generate' to load results",
                    ],
                },
                {
                    description: "Review and export",
                    details: [
                        "Review totals and breakdowns on screen",
                        "Use export or print options for sharing or auditing",
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
                    description: "Navigate to Bill in the sidebar",
                    details: [],
                },
                {
                    description: "View the bills list",
                    details: [
                        "Bills are shown with their status: pending, submitted, closed, reopened",
                        "Use filters to narrow down by status, date, or station",
                    ],
                },
                {
                    description: "View bill details",
                    details: [
                        "Click on any bill to see its items, payments, and status history",
                    ],
                },
                {
                    description: "Admin access is read-only",
                    details: [
                        "Admins can view bills for troubleshooting and auditing",
                        "For processing payments, use the Supervisor or Cashier role",
                        "For voiding or quantity changes, use the Supervisor role",
                    ],
                },
            ],
        },
    ];

    return (
        <SecureRoute roleRequired="admin">
        <RoleAwareLayout>
            <Container fluid className="py-4">
                {/* Header */}
                <div className="bg-primary text-white p-4 mb-4 rounded">
                    <h1 className="h3 mb-2">
                        <i className="bi bi-question-circle me-2"></i>
                        Admin User Documentation
                    </h1>
                    <p className="mb-0">
                        Step-by-step guides for administrative tasks in the POS system
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
                            As an Admin, you manage the entire system — users, stations, menus, pricelists,
                            licensing, and reports. You are responsible for the initial setup before any other
                            role can operate. Complete the setup journeys in order: create stations and categories
                            first, then pricelists, then link them together, and finally create staff accounts.
                        </p>
                        <p className="mb-0">
                            <strong>Tip:</strong> Each journey lists its prerequisites — complete them first to
                            avoid errors mid-workflow.
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
                                            Manage Categories &amp; Menu Items
                                        </a>
                                    </li>
                                    <li className="mb-2">
                                        <a href="/admin/menu/pricelist" className="text-decoration-none">
                                            <i className="bi bi-tags me-2"></i>
                                            Manage Pricelists
                                        </a>
                                    </li>
                                    <li className="mb-2">
                                        <a href="/storekeeper/stock" className="text-decoration-none">
                                            <i className="bi bi-boxes me-2"></i>
                                            Inventory &amp; Stock
                                        </a>
                                    </li>
                                </ul>
                            </Col>
                            <Col md={6}>
                                <ul className="list-unstyled">
                                    <li className="mb-2">
                                        <a href="/admin/production" className="text-decoration-none">
                                            <i className="bi bi-box-seam me-2"></i>
                                            Production Management
                                        </a>
                                    </li>
                                    <li className="mb-2">
                                        <a href="/admin/reports" className="text-decoration-none">
                                            <i className="bi bi-bar-chart me-2"></i>
                                            Reports &amp; Analytics
                                        </a>
                                    </li>
                                    <li className="mb-2">
                                        <a href="/admin/license" className="text-decoration-none">
                                            <i className="bi bi-patch-check me-2"></i>
                                            License Management
                                        </a>
                                    </li>
                                    <li className="mb-2">
                                        <a href="/admin/settings" className="text-decoration-none">
                                            <i className="bi bi-gear me-2"></i>
                                            System Settings &amp; Backup
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
