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
    if (typeof window === "undefined") return 240;
    if (window.innerWidth < 1024) return 60;
    if (window.innerWidth < 1280) return 200;
    if (window.innerWidth < 1600) return 220;
    return 240;
}

const SupervisorLayout: React.FC<SupervisorLayoutProps> = ({ children, authError }) => {
    useTooltips();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(240);
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
                    id: "menu-items",
                    label: "Items",
                    icon: "bi-bag",
                    path: "/supervisor/menu/items",
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
            path: "/supervisor/station",
        },
        {
            id: "production",
            label: "Production",
            icon: "bi-box-seam",
            submenu: [
                {
                    id: "production-sessions",
                    label: "Manage production",
                    icon: "bi-collection",
                    path: "/supervisor/production",
                },
                {
                    id: "production-history",
                    label: "Transactions",
                    icon: "bi-clock-history",
                    path: "/supervisor/production/history",
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
                    id: "reports-bill-payments",
                    label: "Bill Payments",
                    icon: "bi-receipt-cutoff",
                    path: "/admin/reports/bill-payments",
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

    const toggleMenu = (menuId: string) => {
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
                <div className="p-2 border-bottom border-secondary">
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
                <nav className="flex-grow-1 px-2 pt-1 pb-2" style={{ overflowY: "auto" }}>
                    <ul className="nav nav-pills flex-column">
                        {visibleMenuItems.map((item) => (
                            <li key={item.id} className="nav-item mb-1">
                                {item.submenu ? (
                                    <div>
                                        <button
                                            className={"nav-link w-100 text-start d-flex align-items-center"}
                                            onClick={() => toggleMenu(item.id)}
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                color: "rgba(255,255,255,0.8)",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <i className={`bi ${item.icon} me-2`}></i>
                                            {!isCollapsed && <span>{item.label}</span>}
                                            {!isCollapsed && (
                                                <i className={`bi ${expandedMenus.includes(item.id) ? "bi-chevron-up" : "bi-chevron-down"} ms-auto`}></i>
                                            )}
                                        </button>
                                        {expandedMenus.includes(item.id) && !isCollapsed && (
                                            <ul className="nav nav-pills flex-column ms-2 mt-1">
                                                {item.submenu.map((subItem) => (
                                                    <li key={subItem.id} className="nav-item mb-1">
                                                        <Link
                                                            href={subItem.path}
                                                            className={`nav-link w-100 text-start d-flex align-items-center ${activeItem === subItem.id ? "active" : ""}`}
                                                            onClick={() => setActiveItem(subItem.id)}
                                                            style={{
                                                                background: activeItem === subItem.id ? "var(--bs-primary)" : "transparent",
                                                                border: "none",
                                                                color: activeItem === subItem.id ? "white" : "rgba(255,255,255,0.8)",
                                                                fontSize: "0.85rem",
                                                                padding: "0.35rem 0.6rem",
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
                                        className={`nav-link w-100 text-start d-flex align-items-center ${activeItem === item.id ? "active" : ""}`}
                                        onClick={() => setActiveItem(item.id)}
                                        style={{
                                            background: activeItem === item.id ? "var(--bs-primary)" : "transparent",
                                            border: "none",
                                            color: activeItem === item.id ? "white" : "rgba(255,255,255,0.8)",
                                            textDecoration: "none",
                                        }}
                                    >
                                        <i className={`bi ${item.icon} me-2`}></i>
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
                    <div className="p-2">
                        <LogoutButton />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow-1 d-flex flex-column min-w-0 overflow-hidden">
                {/* Page Content */}
                <main className="flex-grow-1 p-3 min-w-0" style={{ overflowY: "auto" }}>
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
