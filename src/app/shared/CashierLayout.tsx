"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useStation } from "../contexts/StationContext";
import LogoutButton from "../components/LogoutButton";
import AppVersion from "../components/AppVersion";
import StationSwitcher from "../components/StationSwitcher";
import { AuthError } from "../types/types";
import { useNavigation } from "../hooks/useNavigation";
import { cashierRoutes, CASHIER_DEFAULT_BREADCRUMB } from "./routeConfigs";

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
    const [hiddenMenuIds, setHiddenMenuIds] = useState<Set<string>>(new Set());
    const { activeItem, setActiveItem, breadcrumbs, expandedMenus, setExpandedMenus } = useNavigation(cashierRoutes, CASHIER_DEFAULT_BREADCRUMB);
    const { user, logout } = useAuth();
    const { currentStation } = useStation();
    const router = useRouter();

    useEffect(() => {
        const update = () => setSidebarWidth(getCashierExpandedSidebarWidth());
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);


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

    const visibleMenuItems = menuItems.filter((item) => !hiddenMenuIds.has(item.id));

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
