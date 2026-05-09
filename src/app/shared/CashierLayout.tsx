"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useStation } from "../contexts/StationContext";
import LogoutButton from "../components/LogoutButton";
import AppVersion from "../components/AppVersion";
import StationSwitcher from "../components/StationSwitcher";
import { AuthError } from "../types/types";

interface CashierLayoutProps {
    children: React.ReactNode;
    authError: AuthError | null;
}

/** Matches laptop-width sidebar narrowing (see SupervisorLayout / globals.css breakpoint). */
function getCashierExpandedSidebarWidth(): number {
    if (typeof window === "undefined") return 250;
    if (window.innerWidth < 1024) return 60;
    if (window.innerWidth < 1400) return 220;
    return 250;
}

const CashierLayout: React.FC<CashierLayoutProps> = ({ children, authError }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(250);
    const [activeItem, setActiveItem] = useState("");
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
    const [breadcrumbs, setBreadcrumbs] = useState<Array<{ label: string, path: string }>>([]);
    const [hiddenMenuIds, setHiddenMenuIds] = useState<Set<string>>(new Set());
    const { user, logout } = useAuth();
    const { currentStation } = useStation();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const update = () => setSidebarWidth(getCashierExpandedSidebarWidth());
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

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

        // Accordion: only one submenu open; opening another closes the rest
        setExpandedMenus((prev) => {
            if (prev.includes(menuId)) {
                return prev.filter((id) => id !== menuId);
            }
            return [menuId];
        });
    };

    const handleItemClick = (itemId: string, path: string, event?: React.MouseEvent<HTMLButtonElement>) => {
        setActiveItem(itemId);
        router.push(path);
        // Focus the clicked menu item for better accessibility
        if (event?.currentTarget) {
            event.currentTarget.focus();
        }
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

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) return;
        fetch("/api/system/module-visibility?role=cashier", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.visibility && typeof data.visibility === "object") {
                    setHiddenMenuIds(
                        new Set(
                            Object.entries(data.visibility as Record<string, boolean>)
                                .filter(([, v]) => v === false)
                                .map(([id]) => id)
                        )
                    );
                }
            })
            .catch(() => {});
    }, []);

    const visibleMenuItems = menuItems
        .filter((item) => !hiddenMenuIds.has(item.id))
        .map((item) => ({
            ...item,
            submenu: item.submenu?.filter((sub) => !hiddenMenuIds.has(sub.id)),
        }))
        .filter((item) => !item.submenu || item.submenu.length > 0);

    return (
        <div className="d-flex vh-100">
            {/* Sidebar */}
            <div className={`bg-dark text-white d-flex flex-column ${isCollapsed ? "sidebar-collapsed" : "sidebar-expanded"}`}
                style={{
                    width: isCollapsed ? "60px" : `${sidebarWidth}px`,
                    minWidth: isCollapsed ? "60px" : `${sidebarWidth}px`,
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
                    <div className="px-3 pb-1">
                        <div className="text-muted small fw-semibold text-uppercase">
                            <i className="bi bi-list-ul me-1"></i>
                            Navigation
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-grow-1 px-3 pt-1 pb-3">
                    <ul className="nav nav-pills flex-column">
                        {visibleMenuItems.map((item) => (
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
