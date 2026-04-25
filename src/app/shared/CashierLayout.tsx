"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useStation } from "../contexts/StationContext";
import LogoutButton from "../components/LogoutButton";
import AppVersion from "../components/AppVersion";
import StationSwitcher from "../components/StationSwitcher";
import HelpMenu from "../components/HelpMenu";
import { AuthError } from "../types/types";

interface CashierLayoutProps {
    children: React.ReactNode;
    authError: AuthError | null;
}

const CashierLayout: React.FC<CashierLayoutProps> = ({ children, authError }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeItem, setActiveItem] = useState("");
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
    const [breadcrumbs, setBreadcrumbs] = useState<Array<{ label: string, path: string }>>([]);
    const { user, logout } = useAuth();
    const { currentStation } = useStation();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Set active item and breadcrumbs based on current path
        const path = pathname;
        let activeItemId = "";
        let breadcrumbItems: Array<{ label: string, path: string }> = [];
        const expandedMenuIds: string[] = [];

        // Dashboard
        if (path === "/home/cashier" || path === "/home/cashier/") {
            activeItemId = "dashboard";
            breadcrumbItems = [{ label: "Dashboard", path: "/home/cashier" }];
        }
        // Bills section
        else if (path.includes("/home/cashier/bills")) {
            expandedMenuIds.push("bills");
            activeItemId = "bills";
            breadcrumbItems = [
                { label: "Dashboard", path: "/home/cashier" },
                { label: "Bills", path: "/home/cashier/bills" }
            ];
        }
        // Void Requests section
        else if (path.includes("/home/cashier/void-requests")) {
            activeItemId = "void-requests";
            breadcrumbItems = [
                { label: "Dashboard", path: "/home/cashier" },
                { label: "Void Requests", path: "/home/cashier/void-requests" }
            ];
        }
        // Reports section
        else if (path.includes("/admin/reports")) {
            expandedMenuIds.push("reports");
            if (path === "/admin/reports" || path === "/admin/reports/") {
                activeItemId = "reports-dashboard";
                breadcrumbItems = [
                    { label: "Dashboard", path: "/home/cashier" },
                    { label: "Reports", path: "/admin/reports" }
                ];
            } else if (path.includes("/admin/reports/sales-revenue")) {
                activeItemId = "reports-sales-revenue";
                breadcrumbItems = [
                    { label: "Dashboard", path: "/home/cashier" },
                    { label: "Reports", path: "/admin/reports" },
                    { label: "Sales Revenue", path: "/admin/reports/sales-revenue" }
                ];
            } else if (path.includes("/admin/reports/production-stock-revenue")) {
                activeItemId = "reports-production-stock-revenue";
                breadcrumbItems = [
                    { label: "Dashboard", path: "/home/cashier" },
                    { label: "Reports", path: "/admin/reports" },
                    { label: "Production/Stock Revenue", path: "/admin/reports/production-stock-revenue" }
                ];
            } else if (path.includes("/admin/reports/items-sold-count")) {
                activeItemId = "reports-items-sold-count";
                breadcrumbItems = [
                    { label: "Dashboard", path: "/home/cashier" },
                    { label: "Reports", path: "/admin/reports" },
                    { label: "Items Sold Count", path: "/admin/reports/items-sold-count" }
                ];
            } else if (path.includes("/admin/reports/voided-items")) {
                activeItemId = "reports-voided-items";
                breadcrumbItems = [
                    { label: "Dashboard", path: "/home/cashier" },
                    { label: "Reports", path: "/admin/reports" },
                    { label: "Voided Items", path: "/admin/reports/voided-items" }
                ];
            } else if (path.includes("/admin/reports/expenditure")) {
                activeItemId = "reports-expenditure";
                breadcrumbItems = [
                    { label: "Dashboard", path: "/home/cashier" },
                    { label: "Reports", path: "/admin/reports" },
                    { label: "Expenditure", path: "/admin/reports/expenditure" }
                ];
            } else if (path.includes("/admin/reports/invoices-pending-bills")) {
                activeItemId = "reports-invoices-pending-bills";
                breadcrumbItems = [
                    { label: "Dashboard", path: "/home/cashier" },
                    { label: "Reports", path: "/admin/reports" },
                    { label: "Invoices & Pending Bills", path: "/admin/reports/invoices-pending-bills" }
                ];
            } else if (path.includes("/admin/reports/purchase-orders")) {
                activeItemId = "reports-purchase-orders";
                breadcrumbItems = [
                    { label: "Dashboard", path: "/home/cashier" },
                    { label: "Reports", path: "/admin/reports" },
                    { label: "Purchase Orders", path: "/admin/reports/purchase-orders" }
                ];
            } else if (path.includes("/admin/reports/pnl")) {
                activeItemId = "reports-pnl";
                breadcrumbItems = [
                    { label: "Dashboard", path: "/home/cashier" },
                    { label: "Reports", path: "/admin/reports" },
                    { label: "Profit & Loss", path: "/admin/reports/pnl" }
                ];
            }
        }

        setActiveItem(activeItemId);
        setBreadcrumbs(breadcrumbItems);
        setExpandedMenus(expandedMenuIds);
    }, [pathname]);

    const toggleMenu = (menuId: string) => {
        const menuItem = menuItems.find(item => item.id === menuId);

        // Check if any sub-item is currently active (if submenu exists)
        // Note: CashierLayout doesn't have submenus, but keeping this for consistency
        if (menuItem && "submenu" in menuItem) {
            const submenu = menuItem.submenu as Array<{ id: string; label: string; icon: string; path: string }> | undefined;
            if (submenu) {
                const hasActiveSubItem = submenu.some(
                    subItem => activeItem === subItem.id
                );

                // Prevent collapse if a sub-item is active
                if (hasActiveSubItem && expandedMenus.includes(menuId)) {
                    return; // Don't allow collapse
                }
            }
        }

        // Normal toggle behavior
        setExpandedMenus(prev =>
            prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    const handleItemClick = (itemId: string, path: string, event?: React.MouseEvent<HTMLButtonElement>) => {
        setActiveItem(itemId);
        router.push(path);
        // Focus the clicked menu item for better accessibility
        if (event?.currentTarget) {
            event.currentTarget.focus();
        }
    };

    const handleBreadcrumbClick = (path: string) => {
        router.push(path);
    };

    const menuItems = [
        {
            id: "dashboard",
            label: "Dashboard",
            icon: "bi-house",
            path: "/home/cashier",
        },
        {
            id: "bills",
            label: "Bills",
            icon: "bi-receipt",
            path: "/home/cashier/bills",
        },
        {
            id: "void-requests",
            label: "Void Requests",
            icon: "bi-exclamation-triangle",
            path: "/home/cashier/void-requests",
        },
        {
            id: "reports",
            label: "Reports",
            icon: "bi-bar-chart",
            submenu: [
                {
                    id: "reports-dashboard",
                    label: "Dashboard",
                    icon: "bi-speedometer2",
                    path: "/admin/reports",
                },
                {
                    id: "reports-sales-revenue",
                    label: "Sales Revenue",
                    icon: "bi-currency-dollar",
                    path: "/admin/reports/sales-revenue",
                },
                {
                    id: "reports-production-stock-revenue",
                    label: "Production/Stock Revenue",
                    icon: "bi-box-seam",
                    path: "/admin/reports/production-stock-revenue",
                },
                {
                    id: "reports-items-sold-count",
                    label: "Items Sold Count",
                    icon: "bi-cart",
                    path: "/admin/reports/items-sold-count",
                },
                {
                    id: "reports-voided-items",
                    label: "Voided Items",
                    icon: "bi-exclamation-triangle",
                    path: "/admin/reports/voided-items",
                },
                {
                    id: "reports-expenditure",
                    label: "Expenditure",
                    icon: "bi-cash-stack",
                    path: "/admin/reports/expenditure",
                },
                {
                    id: "reports-invoices-pending-bills",
                    label: "Invoices & Pending Bills",
                    icon: "bi-file-earmark-text",
                    path: "/admin/reports/invoices-pending-bills",
                },
                {
                    id: "reports-purchase-orders",
                    label: "Purchase Orders",
                    icon: "bi-cart-check",
                    path: "/admin/reports/purchase-orders",
                },
                {
                    id: "reports-pnl",
                    label: "Profit & Loss",
                    icon: "bi-graph-up-arrow",
                    path: "/admin/reports/pnl",
                },
            ],
        },
    ];

    return (
        <div className="d-flex vh-100">
            {/* Sidebar */}
            <div className={`bg-dark text-white d-flex flex-column ${isCollapsed ? "sidebar-collapsed" : "sidebar-expanded"}`}
                style={{
                    width: isCollapsed ? "60px" : "250px",
                    minWidth: isCollapsed ? "60px" : "250px",
                    transition: "width 0.3s ease"
                }}>

                {/* Header */}
                <div className="p-3 border-bottom">
                    <div className="d-flex align-items-center justify-content-between">
                        {!isCollapsed && (
                            <div className="flex-grow-1">
                                <div className="fw-bold">{user?.firstname} {user?.lastname}</div>
                                <small className="text-muted">Cashier</small>
                            </div>
                        )}
                        <button
                            className="btn btn-link text-white p-0"
                            onClick={() => setIsCollapsed(!isCollapsed)}
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
                <nav className="flex-grow-1 p-3">
                    <ul className="nav nav-pills flex-column">
                        {menuItems.map((item) => (
                            <li key={item.id} className="nav-item mb-2">
                                {item.submenu ? (
                                    <div>
                                        <button
                                            className={`nav-link w-100 text-start d-flex align-items-center ${expandedMenus.includes(item.id) ? "" : ""}`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                toggleMenu(item.id);
                                            }}
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                color: "rgba(255,255,255,0.8)",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <i className={`bi ${item.icon} me-3`}></i>
                                            {!isCollapsed && <span>{item.label}</span>}
                                            {!isCollapsed && (
                                                <i className={`bi ${expandedMenus.includes(item.id) ? "bi-chevron-up" : "bi-chevron-down"} ms-auto`}></i>
                                            )}
                                        </button>
                                        {!isCollapsed && expandedMenus.includes(item.id) && (
                                            <ul className="nav nav-pills flex-column ms-3 mt-1">
                                                {item.submenu.map((subItem) => (
                                                    <li key={subItem.id} className="nav-item mb-1">
                                                        <button
                                                            className={`nav-link w-100 text-start d-flex align-items-center ${activeItem === subItem.id ? "active" : ""}`}
                                                            onClick={(e) => handleItemClick(subItem.id, subItem.path, e)}
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
                                        className={`nav-link w-100 text-start d-flex align-items-center ${activeItem === item.id ? "active" : ""}`}
                                        onClick={(e) => handleItemClick(item.id, item.path, e)}
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
                <div className="border-top">
                    <AppVersion isCollapsed={isCollapsed} />
                    <div className="p-3">
                        <LogoutButton />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow-1 d-flex flex-column">
                {/* Top Navigation */}
                <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom">
                    <div className="container-fluid">
                        <div className="d-flex align-items-center">
                            <h4 className="mb-0 me-3">Dashboard</h4>
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
                                    <a className="dropdown-item" href="/profile">
                                        <i className="bi bi-person me-2"></i>
                                        Account
                                    </a>
                                </li>
                                <li>
                                    <a className="dropdown-item" href="/profile">
                                        <i className="bi bi-sliders me-2"></i>
                                        Preferences
                                    </a>
                                </li>
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                    <HelpMenu />
                                </li>
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                    <button className="dropdown-item" onClick={logout}>
                                        <i className="bi bi-box-arrow-right me-2"></i>
                                        Logout
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </nav>

                {/* Page Content */}
                <main className="flex-grow-1 p-4">
                    {authError && (
                        <div className="alert alert-danger" role="alert">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            {authError.message}
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
};

export default CashierLayout;
