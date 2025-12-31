"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useStation } from "../contexts/StationContext";
import LogoutButton from "../components/LogoutButton";
import StationSwitcher from "../components/StationSwitcher";
import { AuthError } from "../types/types";

interface SalesLayoutProps {
    children: React.ReactNode;
    authError: AuthError | null;
}

const SalesLayout: React.FC<SalesLayoutProps> = ({ children, authError }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeItem, setActiveItem] = useState("");
    const [breadcrumbs, setBreadcrumbs] = useState<Array<{ label: string, path: string }>>([]);
    const { user, logout } = useAuth();
    const { currentStation } = useStation();
    const router = useRouter();

    useEffect(() => {
        // Set active item and breadcrumbs based on current path
        const path = window.location.pathname;
        let activeItemId = "";
        let breadcrumbItems: Array<{ label: string, path: string }> = [];

        // Dashboard
        if (path === "/home" || path === "/home/") {
            activeItemId = "dashboard";
            breadcrumbItems = [{ label: "Dashboard", path: "/home" }];
        }
        // Bill section
        else if (path.includes("/home/billing")) {
            activeItemId = "bill";
            breadcrumbItems = [
                { label: "Dashboard", path: "/home" },
                { label: "Bill", path: "/home/billing" }
            ];
        }
        // My Sales section
        else if (path.includes("/home/my-sales")) {
            activeItemId = "my-sales";
            breadcrumbItems = [
                { label: "Dashboard", path: "/home" },
                { label: "My Sales", path: "/home/my-sales" }
            ];
        }
        // Pricelist Catalog section
        else if (path.includes("/home/pricelist-catalog")) {
            activeItemId = "pricelist-catalog";
            breadcrumbItems = [
                { label: "Dashboard", path: "/home" },
                { label: "Pricelist Catalog", path: "/home/pricelist-catalog" }
            ];
        }

        setActiveItem(activeItemId);
        setBreadcrumbs(breadcrumbItems);
    }, []);


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
            path: "/home",
        },
        {
            id: "bill",
            label: "Bill",
            icon: "bi-cart",
            path: "/home/billing",
        },
        {
            id: "my-sales",
            label: "My Sales",
            icon: "bi-receipt",
            path: "/home/my-sales",
        },
        {
            id: "pricelist-catalog",
            label: "Pricelist Catalog",
            icon: "bi-book",
            path: "/home/pricelist-catalog",
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
                                <small className="text-muted">Sales</small>
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

                {/* Station Switcher */}
                {currentStation && !isCollapsed && (
                    <div className="px-3 pb-3">
                        <StationSwitcher />
                    </div>
                )}

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
                <div className="p-3 border-top">
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

export default SalesLayout;
