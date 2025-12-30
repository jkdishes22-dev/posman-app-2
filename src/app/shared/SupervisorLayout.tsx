"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useStation } from "../contexts/StationContext";
import LogoutButton from "../components/LogoutButton";
import StationSwitcher from "../components/StationSwitcher";
import { AuthError } from "../types/types";
import { useTooltips } from "../hooks/useTooltips";

interface SupervisorLayoutProps {
    children: React.ReactNode;
    authError: AuthError | null;
}

const SupervisorLayout: React.FC<SupervisorLayoutProps> = ({ children, authError }) => {
    useTooltips();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeItem, setActiveItem] = useState("");
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
    const [breadcrumbs, setBreadcrumbs] = useState<Array<{ label: string, path: string }>>([]);
    const { user, logout } = useAuth();
    const { currentStation } = useStation();
    const router = useRouter();

    useEffect(() => {
        // Set active item based on current path - Rule 5.13: Active State Management
        const path = window.location.pathname;

        // Path to active item mapping
        const pathToActiveItemMap = [
            { path: "/supervisor", item: "dashboard" },
            { path: "/supervisor/", item: "dashboard" },
            { path: "/supervisor/bills", item: "bills-overview" },
            { path: "/home/billing", item: "bills-create" },
            { path: "/home/cashier/bills", item: "bills-manage" },
            { path: "/supervisor/void-requests", item: "void-requests" },
            { path: "/supervisor/reopened-bills", item: "reopened-bills" },
            { path: "/supervisor/menu/category", item: "menu-category" },
            { path: "/supervisor/menu/pricelist", item: "menu-pricelist" },
            { path: "/supervisor/menu/recipes", item: "menu-recipes" },
            { path: "/supervisor/production/issue", item: "production-issuing" },
            { path: "/supervisor/station", item: "stations-overview" },
            { path: "/supervisor/station/user", item: "station-users" },
            { path: "/storekeeper/suppliers", item: "suppliers-list" },
            { path: "/storekeeper/purchase-orders", item: "suppliers-purchase-orders" },
            { path: "/storekeeper", item: "inventory-dashboard" },
            { path: "/storekeeper/stock", item: "inventory-list" },
            { path: "/storekeeper/inventory/transactions", item: "inventory-transactions" },
            { path: "/supervisor/reports/sales", item: "sales-reports" },
            { path: "/supervisor/reports/bills", item: "bills-reports" },
            { path: "/supervisor/reports/production", item: "production-reports" },
            { path: "/supervisor/reports", item: "reports" },
            { path: "/supervisor/settings", item: "settings" },
        ];

        // Set breadcrumbs and expanded menus based on path
        let breadcrumbItems: Array<{ label: string, path: string }> = [];
        const expandedMenuIds: string[] = [];

        // Determine breadcrumbs and expanded menus based on path
        if (path.includes("/supervisor/menu")) {
            expandedMenuIds.push("menu-pricing");
            if (path.includes("/supervisor/menu/recipes")) {
                breadcrumbItems = [
                    { label: "Dashboard", path: "/supervisor" },
                    { label: "Menu & Pricing", path: "/supervisor/menu" },
                    { label: "Recipes", path: "/supervisor/menu/recipes" }
                ];
            } else {
                breadcrumbItems = [
                    { label: "Dashboard", path: "/supervisor" },
                    { label: "Menu & Pricing", path: "/supervisor/menu" }
                ];
            }
        } else if (path.includes("/supervisor/production")) {
            expandedMenuIds.push("production");
            breadcrumbItems = [
                { label: "Dashboard", path: "/supervisor" },
                { label: "Production", path: "/supervisor/production" }
            ];
        } else if (path.includes("/supervisor/station")) {
            expandedMenuIds.push("stations");
            if (path.includes("/supervisor/station/user")) {
                breadcrumbItems = [
                    { label: "Dashboard", path: "/supervisor" },
                    { label: "Stations", path: "/supervisor/station" },
                    { label: "Station Users", path: "/supervisor/station/user" }
                ];
            } else {
                breadcrumbItems = [
                    { label: "Dashboard", path: "/supervisor" },
                    { label: "Stations", path: "/supervisor/station" },
                    { label: "Overview", path: "/supervisor/station" }
                ];
            }
        } else if (path.includes("/storekeeper") && (path.includes("/storekeeper/suppliers") || path.includes("/storekeeper/purchase-orders"))) {
            expandedMenuIds.push("suppliers");
            if (path.includes("/storekeeper/suppliers")) {
                breadcrumbItems = [
                    { label: "Dashboard", path: "/supervisor" },
                    { label: "Suppliers", path: "/storekeeper/suppliers" },
                    { label: "Suppliers", path: "/storekeeper/suppliers" }
                ];
            } else if (path.includes("/storekeeper/purchase-orders")) {
                breadcrumbItems = [
                    { label: "Dashboard", path: "/supervisor" },
                    { label: "Suppliers", path: "/storekeeper/suppliers" },
                    { label: "Purchase Orders", path: "/storekeeper/purchase-orders" }
                ];
            }
        } else if (path.includes("/storekeeper")) {
            expandedMenuIds.push("inventory");
            if (path.includes("/storekeeper/inventory/transactions")) {
                breadcrumbItems = [
                    { label: "Dashboard", path: "/supervisor" },
                    { label: "Inventory", path: "/storekeeper" },
                    { label: "Transactions", path: "/storekeeper/inventory/transactions" }
                ];
            } else if (path.includes("/storekeeper/stock")) {
                breadcrumbItems = [
                    { label: "Dashboard", path: "/supervisor" },
                    { label: "Inventory", path: "/storekeeper" },
                    { label: "Inventory List", path: "/storekeeper/stock" }
                ];
            } else {
                breadcrumbItems = [
                    { label: "Dashboard", path: "/supervisor" },
                    { label: "Inventory", path: "/storekeeper" },
                    { label: "Dashboard", path: "/storekeeper" }
                ];
            }
        } else if (path.includes("/supervisor/reports")) {
            expandedMenuIds.push("reports");
            breadcrumbItems = [
                { label: "Dashboard", path: "/supervisor" },
                { label: "Reports", path: "/supervisor/reports" }
            ];
        } else if (path.includes("/supervisor/bills") || path.includes("/home/billing") || path.includes("/home/cashier/bills")) {
            expandedMenuIds.push("bills");
            if (path.includes("/supervisor/bills")) {
                breadcrumbItems = [
                    { label: "Dashboard", path: "/supervisor" },
                    { label: "Bills Management", path: "/supervisor/bills" },
                    { label: "Bills Overview", path: "/supervisor/bills" }
                ];
            } else if (path.includes("/home/billing")) {
                breadcrumbItems = [
                    { label: "Dashboard", path: "/supervisor" },
                    { label: "Bills Management", path: "/supervisor/bills" },
                    { label: "Create Bill", path: "/home/billing" }
                ];
            } else if (path.includes("/home/cashier/bills")) {
                breadcrumbItems = [
                    { label: "Dashboard", path: "/supervisor" },
                    { label: "Bills Management", path: "/supervisor/bills" },
                    { label: "Manage Bills", path: "/home/cashier/bills" }
                ];
            }
        } else {
            breadcrumbItems = [{ label: "Dashboard", path: "/supervisor" }];
        }

        // Find matching path and set active item
        const matchedItem = pathToActiveItemMap.find(({ path: pathPattern }) =>
            path === pathPattern || path.includes(pathPattern)
        );

        if (matchedItem) {
            setActiveItem(matchedItem.item);
        }

        setBreadcrumbs(breadcrumbItems);
        setExpandedMenus(expandedMenuIds);
    }, []);

    const menuItems = [
        {
            id: "dashboard",
            label: "Dashboard",
            icon: "bi-house",
            path: "/supervisor",
        },
        {
            id: "bills",
            label: "Bills Management",
            icon: "bi-receipt",
            submenu: [
                {
                    id: "bills-create",
                    label: "Create Bill",
                    icon: "bi-plus-circle",
                    path: "/home/billing",
                },
                {
                    id: "bills-manage",
                    label: "Manage Bills",
                    icon: "bi-cash-stack",
                    path: "/home/cashier/bills",
                },
                {
                    id: "bills-overview",
                    label: "Bills Overview",
                    icon: "bi-receipt",
                    path: "/supervisor/bills",
                },
                {
                    id: "void-requests",
                    label: "Void Requests",
                    icon: "bi-x-circle",
                    path: "/supervisor/void-requests",
                },
                {
                    id: "reopened-bills",
                    label: "Reopened Bills",
                    icon: "bi-arrow-clockwise",
                    path: "/supervisor/reopened-bills",
                },
            ],
        },
        {
            id: "menu-pricing",
            label: "Menu & Pricing",
            icon: "bi-list-ul",
            submenu: [
                {
                    id: "menu-category",
                    label: "Categories",
                    icon: "bi-grid",
                    path: "/supervisor/menu/category",
                },
                {
                    id: "menu-recipes",
                    label: "Recipes",
                    icon: "bi-journal-text",
                    path: "/supervisor/menu/recipes",
                },
                {
                    id: "menu-pricelist",
                    label: "Pricelists",
                    icon: "bi-tags",
                    path: "/supervisor/menu/pricelist",
                },
            ],
        },
        {
            id: "production",
            label: "Production",
            icon: "bi-box-seam",
            submenu: [
                {
                    id: "production-issuing",
                    label: "Issue Production",
                    icon: "bi-arrow-up-circle",
                    path: "/supervisor/production/issue",
                },
            ],
        },
        {
            id: "stations",
            label: "Stations",
            icon: "bi-gear",
            submenu: [
                {
                    id: "stations-overview",
                    label: "Overview",
                    icon: "bi-building",
                    path: "/supervisor/station",
                },
                {
                    id: "station-users",
                    label: "Station Users",
                    icon: "bi-people-fill",
                    path: "/supervisor/station/user",
                },
            ],
        },
        {
            id: "suppliers",
            label: "Suppliers",
            icon: "bi-truck",
            submenu: [
                {
                    id: "suppliers-list",
                    label: "Suppliers",
                    icon: "bi-building",
                    path: "/storekeeper/suppliers",
                },
                {
                    id: "suppliers-purchase-orders",
                    label: "Purchase Orders",
                    icon: "bi-cart-check",
                    path: "/storekeeper/purchase-orders",
                },
            ],
        },
        {
            id: "inventory",
            label: "Inventory",
            icon: "bi-boxes",
            submenu: [
                {
                    id: "inventory-dashboard",
                    label: "Dashboard",
                    icon: "bi-speedometer2",
                    path: "/storekeeper",
                },
                {
                    id: "inventory-list",
                    label: "Inventory List",
                    icon: "bi-list-ul",
                    path: "/storekeeper/stock",
                },
                {
                    id: "inventory-transactions",
                    label: "Transactions",
                    icon: "bi-arrow-left-right",
                    path: "/storekeeper/inventory/transactions",
                },
            ],
        },
        {
            id: "reports",
            label: "Reports",
            icon: "bi-bar-chart",
            submenu: [
                {
                    id: "sales-reports",
                    label: "Sales Reports",
                    icon: "bi-graph-up",
                    path: "/supervisor/reports/sales",
                },
                {
                    id: "bills-reports",
                    label: "Bills Reports",
                    icon: "bi-receipt",
                    path: "/supervisor/reports/bills",
                },
                {
                    id: "production-reports",
                    label: "Production Reports",
                    icon: "bi-box-seam",
                    path: "/supervisor/reports/production",
                },
            ],
        },
        {
            id: "settings",
            label: "Settings",
            icon: "bi-gear",
            path: "/supervisor/settings",
        },
    ];

    const handleItemClick = (itemId: string, path: string) => {
        setActiveItem(itemId);
        router.push(path);
    };

    const toggleMenu = (menuId: string) => {
        setExpandedMenus(prev =>
            prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    const handleBreadcrumbClick = (path: string) => {
        router.push(path);
    };

    const getMenuTooltip = (label: string): string => {
        const tooltips: { [key: string]: string } = {
            "Dashboard": "View supervisor dashboard and system overview",
            "Bills Management": "Manage bills, payments, void requests, and reopened bills",
            "Create Bill": "Simple billing interface for creating new bills",
            "Manage Bills": "Full bill management interface with payments, closing, and bulk operations",
            "Bills Overview": "Comprehensive bill management dashboard with analytics and oversight",
            "Void Requests": "Approve or reject void requests from sales team",
            "Reopened Bills": "View and manage bills that have been reopened",
            "Menu & Pricing": "Manage menu items and pricing",
            "Categories": "Manage menu categories and organize items",
            "Recipes": "Manage composite items and their ingredients",
            "Pricelists": "Configure pricing for different stations or customer groups",
            "Production": "Manage production and inventory",
            "Issue Production": "Create a new production issue record",
            "Stations": "Manage POS stations and their configurations",
            "Overview": "View and manage all POS stations",
            "Station Users": "Assign users to stations and manage access",
            "Suppliers": "Manage suppliers and purchase orders",
            "Purchase Orders": "Create and manage purchase orders",
            "Inventory": "Manage inventory levels and transactions",
            "Inventory Dashboard": "Overview of inventory levels and alerts",
            "Inventory List": "View all inventory items and their current levels",
            "Transactions": "View all inventory movement transactions",
            "Reports": "View reports and system analytics",
            "Sales Reports": "View sales reports and analytics",
            "Bills Reports": "View bills reports and analytics",
            "Production Reports": "View production reports and analytics",
            "Settings": "Manage supervisor settings and preferences",
        };
        return tooltips[label] || `Navigate to ${label}`;
    };

    return (
        <div className="d-flex vh-100">
            {/* Sidebar */}
            <div
                className={`bg-dark text-white d-flex flex-column ${isCollapsed ? "sidebar-collapsed" : "sidebar-expanded"
                    }`}
                style={{
                    width: isCollapsed ? "60px" : "280px",
                    transition: "width 0.3s ease",
                    minHeight: "100vh",
                }}
            >
                {/* Header */}
                <div className="p-3 border-bottom border-secondary">
                    <div className="d-flex align-items-center">
                        {!isCollapsed && (
                            <div className="flex-grow-1">
                                <div className="fw-bold text-white">{user?.firstname} {user?.lastname}</div>
                                <small className="text-muted">Supervisor</small>
                            </div>
                        )}
                        <button
                            className="btn btn-outline-light ms-auto p-2"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            style={{
                                border: "1px solid rgba(255,255,255,0.3)",
                                borderRadius: "6px",
                                minWidth: "36px",
                                minHeight: "36px"
                            }}
                            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            <div className="hamburger-icon">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </button>
                    </div>
                </div>


                {/* Separator and Navigation Label */}
                {!isCollapsed && (
                    <div className="px-3 pb-2">
                        <hr className="text-white-50 mb-2" />
                        <div className="text-muted small fw-semibold text-uppercase">
                            <i className="bi bi-list-ul me-1"></i>
                            Navigation
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-grow-1 p-3" style={{ overflowY: "auto" }}>
                    <ul className="nav nav-pills flex-column">
                        {menuItems.map((item) => (
                            <li key={item.id} className="nav-item mb-2">
                                {item.submenu ? (
                                    <div>
                                        <button
                                            className={`nav-link w-100 text-start d-flex align-items-center ${expandedMenus.includes(item.id) ? "active" : ""}`}
                                            onClick={() => toggleMenu(item.id)}
                                            style={{
                                                background: expandedMenus.includes(item.id) ? "var(--bs-primary)" : "transparent",
                                                border: "none",
                                                color: expandedMenus.includes(item.id) ? "white" : "rgba(255,255,255,0.8)",
                                            }}
                                        >
                                            <i className={`bi ${item.icon} me-3`}></i>
                                            {!isCollapsed && <span>{item.label}</span>}
                                            {!isCollapsed && (
                                                <i className={`bi ${expandedMenus.includes(item.id) ? "bi-chevron-up" : "bi-chevron-down"} ms-auto`}></i>
                                            )}
                                        </button>
                                        {expandedMenus.includes(item.id) && !isCollapsed && (
                                            <ul className="nav nav-pills flex-column ms-3 mt-2">
                                                {item.submenu.map((subItem) => (
                                                    <li key={subItem.id} className="nav-item mb-1">
                                                        <button
                                                            className={`nav-link w-100 text-start d-flex align-items-center ${activeItem === subItem.id ? "active" : ""}`}
                                                            onClick={() => handleItemClick(subItem.id, subItem.path)}
                                                            style={{
                                                                background: activeItem === subItem.id ? "var(--bs-primary)" : "transparent",
                                                                border: "none",
                                                                color: activeItem === subItem.id ? "white" : "rgba(255,255,255,0.8)",
                                                                fontSize: "0.9rem",
                                                                padding: "0.5rem 0.75rem",
                                                            }}
                                                        >
                                                            <i className={`bi ${subItem.icon} me-2`}></i>
                                                            {subItem.label}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        className={`nav-link w-100 text-start d-flex align-items-center ${activeItem === item.id ? "active" : ""
                                            }`}
                                        onClick={() => handleItemClick(item.id, item.path)}
                                        style={{
                                            background: activeItem === item.id ? "var(--bs-primary)" : "transparent",
                                            border: "none",
                                            color: activeItem === item.id ? "white" : "rgba(255,255,255,0.8)",
                                        }}
                                    >
                                        <i className={`bi ${item.icon} me-3`}></i>
                                        {!isCollapsed && <span>{item.label}</span>}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>


                {/* Logout */}
                <div className="p-3 border-top border-secondary">
                    <LogoutButton />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow-1 d-flex flex-column">
                {/* Top Navigation */}
                <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom">
                    <div className="container-fluid">
                        <div className="d-flex align-items-center">
                            <h4 className="mb-0 me-3">Dashboard</h4>
                            {/* Breadcrumbs */}
                            {breadcrumbs.length > 1 && (
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb mb-0">
                                        {breadcrumbs.map((crumb, index) => (
                                            <li key={index} className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? "active" : ""}`}>
                                                {index === breadcrumbs.length - 1 ? (
                                                    crumb.label
                                                ) : (
                                                    <button
                                                        className="btn btn-link p-0 text-decoration-none"
                                                        onClick={() => handleBreadcrumbClick(crumb.path)}
                                                        style={{ color: "var(--bs-primary)" }}
                                                    >
                                                        {crumb.label}
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                </nav>
                            )}
                        </div>

                        <div className="d-flex align-items-center">

                            {/* Profile Dropdown */}
                            <div className="dropdown">
                                <button
                                    className="btn btn-outline-secondary dropdown-toggle"
                                    type="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    <i className="bi bi-person-circle me-2"></i>
                                    Profile
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end">
                                    <li>
                                        <a className="dropdown-item" href="/profile">
                                            <i className="bi bi-gear me-2"></i>
                                            Settings
                                        </a>
                                    </li>
                                    <li>
                                        <a className="dropdown-item" href="/profile/account">
                                            <i className="bi bi-person me-2"></i>
                                            Account
                                        </a>
                                    </li>
                                    <li>
                                        <a className="dropdown-item" href="/profile/preferences">
                                            <i className="bi bi-sliders me-2"></i>
                                            Preferences
                                        </a>
                                    </li>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li>
                                        <button
                                            className="dropdown-item text-danger"
                                            onClick={() => logout()}
                                        >
                                            <i className="bi bi-box-arrow-right me-2"></i>
                                            Logout
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Page Content */}
                <main className="flex-grow-1 p-4">
                    {authError && (
                        <div className="alert alert-danger" role="alert">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            <strong>Error:</strong> {authError.message}
                            {authError.missingPermissions && (
                                <ul className="mt-2 mb-0">
                                    {authError.missingPermissions.map((perm) => (
                                        <li key={perm}>{perm}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
};

export default SupervisorLayout;

