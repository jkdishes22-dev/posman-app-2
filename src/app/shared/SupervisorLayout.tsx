"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useStation } from "../contexts/StationContext";
import LogoutButton from "../components/LogoutButton";
import StationSwitcher from "../components/StationSwitcher";
import { AuthError } from "../types/types";

interface SupervisorLayoutProps {
    children: React.ReactNode;
    authError: AuthError | null;
}

const SupervisorLayout: React.FC<SupervisorLayoutProps> = ({ children, authError }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeItem, setActiveItem] = useState("");
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
            { path: "/supervisor/billing", item: "billing-fallback" },
            { path: "/supervisor/settings", item: "settings" },
            { path: "/home/cashier/bills", item: "cashier-bills" },
            { path: "/home/my-sales", item: "sales-bills" },
            { path: "/supervisor/void-requests", item: "void-requests" },
            { path: "/supervisor/reopened-bills", item: "reopened-bills" },
            { path: "/supervisor/menu/category", item: "menu-category" },
            { path: "/supervisor/menu/pricelist", item: "menu-pricelist" },
            { path: "/home/pricelist-catalog", item: "pricelist-catalog" },
            { path: "/supervisor/production/items", item: "production-items" },
            { path: "/supervisor/production/definitions", item: "production-definitions" },
            { path: "/supervisor/production", item: "production-daily" },
            { path: "/supervisor/reports/sales", item: "sales-reports" },
            { path: "/supervisor/reports/bills", item: "bills-reports" },
            { path: "/supervisor/reports/production", item: "production-reports" },
            { path: "/supervisor/reports", item: "reports" },
        ];

        // Find matching path and set active item
        const matchedItem = pathToActiveItemMap.find(({ path: pathPattern }) =>
            path === pathPattern || path.includes(pathPattern)
        );

        if (matchedItem) {
            setActiveItem(matchedItem.item);
        }
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
                    id: "bills-overview",
                    label: "Bills Overview",
                    icon: "bi-receipt",
                    path: "/supervisor/bills",
                },
                {
                    id: "billing-fallback",
                    label: "Billing Fallback",
                    icon: "bi-cash-stack",
                    path: "/supervisor/billing",
                },
            ],
        },
        {
            id: "operations",
            label: "Operations",
            icon: "bi-gear-fill",
            submenu: [
                {
                    id: "cashier-bills",
                    label: "Cashier Bills",
                    icon: "bi-cash-stack",
                    path: "/home/cashier/bills",
                },
                {
                    id: "sales-bills",
                    label: "Sales Bills",
                    icon: "bi-receipt",
                    path: "/home/my-sales",
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
                    id: "menu-pricelist",
                    label: "Pricelists",
                    icon: "bi-tags",
                    path: "/supervisor/menu/pricelist",
                },
                {
                    id: "pricelist-catalog",
                    label: "Pricelist Catalog",
                    icon: "bi-book",
                    path: "/home/pricelist-catalog",
                },
            ],
        },
        {
            id: "production",
            label: "Production",
            icon: "bi-box-seam",
            submenu: [
                {
                    id: "production-items",
                    label: "Stock Menu Items",
                    icon: "bi-box",
                    path: "/supervisor/production/items",
                },
                {
                    id: "production-definitions",
                    label: "Ratio Definition",
                    icon: "bi-calculator",
                    path: "/supervisor/production/definitions",
                },
                {
                    id: "production-daily",
                    label: "Daily Production",
                    icon: "bi-calendar-day",
                    path: "/supervisor/production",
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
                            <div>
                                <h5 className="mb-0 text-white">Supervisor Panel</h5>
                                <small className="text-muted">Management Dashboard</small>
                            </div>
                        )}
                        <button
                            className="btn btn-link text-white ms-auto p-1"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                        >
                            <i className={`bi ${isCollapsed ? "bi-chevron-right" : "bi-chevron-left"}`}></i>
                        </button>
                    </div>
                </div>

                {/* User Info */}
                {!isCollapsed && (
                    <div className="p-3 border-bottom border-secondary">
                        <div className="d-flex align-items-center">
                            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3"
                                style={{ width: "40px", height: "40px" }}>
                                <i className="bi bi-person-fill text-white"></i>
                            </div>
                            <div>
                                <div className="fw-bold">{user?.firstname} {user?.lastname}</div>
                                <small className="text-muted">Supervisor</small>
                            </div>
                        </div>
                        {currentStation && (
                            <div className="mt-2">
                                <small className="text-muted">Station: {currentStation.name}</small>
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-grow-1 p-3" style={{ overflowY: "auto" }}>
                    <ul className="nav nav-pills flex-column">
                        {menuItems.map((item) => (
                            <li key={item.id} className="nav-item mb-2">
                                {item.submenu ? (
                                    <div className="dropdown">
                                        <button
                                            className={`nav-link w-100 text-start d-flex align-items-center ${activeItem === item.id ? "active" : ""
                                                }`}
                                            style={{
                                                background: activeItem === item.id ? "var(--bs-primary)" : "transparent",
                                                border: "none",
                                                color: activeItem === item.id ? "white" : "rgba(255,255,255,0.8)",
                                            }}
                                            data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                        >
                                            <i className={`bi ${item.icon} me-3`}></i>
                                            {!isCollapsed && <span>{item.label}</span>}
                                            {!isCollapsed && <i className="bi bi-chevron-down ms-auto"></i>}
                                        </button>
                                        <ul className="dropdown-menu dropdown-menu-dark">
                                            {item.submenu.map((subItem) => (
                                                <li key={subItem.id}>
                                                    <button
                                                        className={`dropdown-item d-flex align-items-center ${activeItem === subItem.id ? "active" : ""
                                                            }`}
                                                        onClick={() => handleItemClick(subItem.id, subItem.path)}
                                                        style={{
                                                            background: activeItem === subItem.id ? "var(--bs-primary)" : "transparent",
                                                            border: "none",
                                                            color: activeItem === subItem.id ? "white" : "rgba(255,255,255,0.8)",
                                                        }}
                                                    >
                                                        <i className={`bi ${subItem.icon} me-2`}></i>
                                                        {subItem.label}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
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

                {/* Station Switcher */}
                {!isCollapsed && currentStation && (
                    <div className="p-3 border-top border-secondary">
                        <div className="mb-2">
                            <small className="text-muted text-uppercase fw-semibold">
                                <i className="bi bi-geo-alt me-1"></i>
                                Current Station
                            </small>
                        </div>
                        <StationSwitcher showLabel={false} size="sm" />
                    </div>
                )}

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
                            <button
                                className="btn btn-link me-3"
                                onClick={() => setIsCollapsed(!isCollapsed)}
                            >
                                <i className="bi bi-list"></i>
                            </button>
                            <h4 className="mb-0">Supervisor Dashboard</h4>
                        </div>

                        <div className="d-flex align-items-center">
                            <span className="text-muted me-3">
                                Welcome, {user?.firstname} {user?.lastname}
                            </span>

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
