"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import LogoutButton from "../components/LogoutButton";
import AppVersion from "../components/AppVersion";
import { AuthError } from "../types/types";
import { useTooltips } from "../hooks/useTooltips";
import { useNavigation } from "../hooks/useNavigation";
import { supervisorRoutes, SUPERVISOR_DEFAULT_BREADCRUMB } from "./routeConfigs";
import { useApiCall } from "../utils/apiUtils";

interface SupervisorLayoutProps {
    children: React.ReactNode;
    authError: AuthError | null;
}

function getExpandedSidebarWidth(): number {
    if (typeof window === "undefined") return 280;
    if (window.innerWidth < 1024) return 60;
    if (window.innerWidth < 1400) return 220;
    return 280;
}

const SupervisorLayout: React.FC<SupervisorLayoutProps> = ({ children, authError }) => {
    useTooltips();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [hiddenMenuIds, setHiddenMenuIds] = useState<Set<string>>(new Set());
    const { activeItem, setActiveItem, expandedMenus, setExpandedMenus } = useNavigation(supervisorRoutes, SUPERVISOR_DEFAULT_BREADCRUMB);
    const { user } = useAuth();
    const apiCall = useApiCall();

    useEffect(() => {
        const update = () => setSidebarWidth(getExpandedSidebarWidth());
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
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
            label: "Billing",
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
                    label: "Process Bills",
                    icon: "bi-cash-stack",
                    path: "/home/cashier/bills",
                },
                {
                    id: "change-requests",
                    label: "Change Requests",
                    icon: "bi-exclamation-triangle",
                    path: "/supervisor/bills/change-requests",
                },
                {
                    id: "reopened-bills",
                    label: "Reopened Bills",
                    icon: "bi-arrow-clockwise",
                    path: "/supervisor/reopened-bills",
                },
                {
                    id: "bill-settings",
                    label: "Bill Settings",
                    icon: "bi-gear",
                    path: "/supervisor/bills/settings",
                },
            ],
        },
        {
            id: "menu-pricing",
            label: "Menus & Pricelist",
            icon: "bi-list-ul",
            submenu: [
                {
                    id: "menu-category",
                    label: "Categories",
                    icon: "bi-grid",
                    path: "/supervisor/menu/category",
                },
                {
                    id: "menu-pricelist",
                    label: "Pricelists",
                    icon: "bi-tags",
                    path: "/supervisor/menu/pricelist",
                },
                {
                    id: "menu-recipes",
                    label: "Recipes",
                    icon: "bi-journal-text",
                    path: "/supervisor/menu/recipes",
                },
            ],
        },
        {
            id: "stations",
            label: "Stations",
            icon: "bi-building",
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
            id: "production",
            label: "Production",
            icon: "bi-box-seam",
            submenu: [
                {
                    id: "production-issuing",
                    label: "Issue Production",
                    icon: "bi-arrow-up-circle",
                    path: "/supervisor/production",
                },
            ],
        },
        {
            id: "expenses",
            label: "Expenses",
            icon: "bi-cash-coin",
            path: "/supervisor/expenses",
        },
        {
            id: "inventory",
            label: "Inventory",
            icon: "bi-boxes",
            submenu: [
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
                    id: "purchase-items",
                    label: "Purchase Config",
                    icon: "bi-box-seam",
                    path: "/supervisor/purchase-items",
                },
                {
                    id: "suppliers-purchase-orders",
                    label: "Purchase Orders",
                    icon: "bi-cart-check",
                    path: "/storekeeper/purchase-orders",
                },
                {
                    id: "suppliers-transactions",
                    label: "Supplier payments",
                    icon: "bi-cash-coin",
                    path: "/storekeeper/suppliers/transactions",
                },
            ],
        },
        {
            id: "reports",
            label: "Reports",
            icon: "bi-bar-chart",
            submenu: [
                {
                    id: "reports-pnl",
                    label: "Profit & Loss",
                    icon: "bi-graph-up-arrow",
                    path: "/admin/reports/pnl",
                },
                {
                    id: "reports-items-sold-count",
                    label: "Items Sold Count",
                    icon: "bi-cart",
                    path: "/admin/reports/items-sold-count",
                },
                {
                    id: "reports-production-stock-revenue",
                    label: "Stock & Production",
                    icon: "bi-box-seam",
                    path: "/admin/reports/production-stock-revenue",
                },
                {
                    id: "reports-expenditure",
                    label: "Expenses",
                    icon: "bi-cash-stack",
                    path: "/admin/reports/expenditure",
                },
                {
                    id: "reports-purchase-orders",
                    label: "Purchase Orders",
                    icon: "bi-cart-check",
                    path: "/admin/reports/purchase-orders",
                },
                {
                    id: "reports-sales-revenue",
                    label: "Sales Revenue",
                    icon: "bi-graph-up",
                    path: "/admin/reports/sales-revenue",
                },
                {
                    id: "reports-bill-payments",
                    label: "Bill Payments",
                    icon: "bi-receipt-cutoff",
                    path: "/admin/reports/bill-payments",
                },
            ],
        },
    ];

    const toggleMenu = (menuId: string) => {
        const menuItem = menuItems.find(item => item.id === menuId);

        // Check if any sub-item is currently active
        if (menuItem?.submenu) {
            const hasActiveSubItem = menuItem.submenu.some(
                subItem => activeItem === subItem.id
            );

            // Prevent collapse if a sub-item is active
            if (hasActiveSubItem && expandedMenus.includes(menuId)) {
                return; // Don't allow collapse
            }
        }

        // Accordion: only one submenu open; opening another closes the rest
        setExpandedMenus((prev) => {
            if (prev.includes(menuId)) {
                return prev.filter((id) => id !== menuId);
            }
            return [menuId];
        });
    };


    useEffect(() => {
        apiCall("/api/system/module-visibility?role=supervisor")
            .then((result) => {
                if (result.status === 200 && result.data?.visibility && typeof result.data.visibility === "object") {
                    setHiddenMenuIds(
                        new Set(
                            Object.entries(result.data.visibility as Record<string, boolean>)
                                .filter(([, v]) => v === false)
                                .map(([id]) => id)
                        )
                    );
                }
            })
            .catch(() => {});
    }, [apiCall]);

    const visibleMenuItems = menuItems
        .filter((item) => !hiddenMenuIds.has(item.id))
        .map((item) => ({
            ...item,
            submenu: item.submenu?.filter((sub) => !hiddenMenuIds.has(sub.id)),
        }))
        .filter((item) => !item.submenu || item.submenu.length > 0);

    return (
        <div className="d-flex vh-100 overflow-hidden">
            {/* Sidebar */}
            <div
                className={`bg-dark text-white d-flex flex-column ${isCollapsed ? "sidebar-collapsed" : "sidebar-expanded"
                    }`}
                style={{
                    width: isCollapsed ? "60px" : `${sidebarWidth}px`,
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


                {/* Navigation */}
                <nav className="flex-grow-1 px-3 pt-1 pb-3" style={{ overflowY: "auto" }}>
                    <ul className="nav nav-pills flex-column">
                        {visibleMenuItems.map((item) => (
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
                                                        <Link
                                                            href={subItem.path}
                                                            className={`nav-link w-100 text-start d-flex align-items-center ${activeItem === subItem.id ? "active" : ""}`}
                                                            onClick={(e) => {
                                                                setActiveItem(subItem.id);
                                                                // Let Link handle navigation naturally
                                                            }}
                                                            style={{
                                                                background: activeItem === subItem.id ? "var(--bs-primary)" : "transparent",
                                                                border: "none",
                                                                color: activeItem === subItem.id ? "white" : "rgba(255,255,255,0.8)",
                                                                fontSize: "0.9rem",
                                                                padding: "0.5rem 0.75rem",
                                                                textDecoration: "none",
                                                            }}
                                                        >
                                                            <i className={`bi ${subItem.icon} me-2`}></i>
                                                            {subItem.label}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ) : (
                                    <Link
                                        href={item.path}
                                        className={`nav-link w-100 text-start d-flex align-items-center ${activeItem === item.id ? "active" : ""
                                            }`}
                                        onClick={(e) => {
                                            setActiveItem(item.id);
                                            // Let Link handle navigation naturally
                                        }}
                                        style={{
                                            background: activeItem === item.id ? "var(--bs-primary)" : "transparent",
                                            border: "none",
                                            color: activeItem === item.id ? "white" : "rgba(255,255,255,0.8)",
                                            textDecoration: "none",
                                        }}
                                    >
                                        <i className={`bi ${item.icon} me-3`}></i>
                                        {!isCollapsed && <span>{item.label}</span>}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>


                {/* Logout */}
                <div className="border-top border-secondary">
                    <AppVersion isCollapsed={isCollapsed} />
                    <div className="p-3">
                        <LogoutButton />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow-1 d-flex flex-column min-w-0 overflow-hidden">
                {/* Page Content */}
                <main className="flex-grow-1 p-4 min-w-0 overflow-hidden">
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

