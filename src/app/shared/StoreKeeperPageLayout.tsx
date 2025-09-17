"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import NavbarTitleSection from "./NavbarTitleSection";
import { AuthError } from "../types/types";

export default function StoreKeeperPageLayout({
    children,
    authError,
}: {
    children: React.ReactNode;
    authError: AuthError | null;
}) {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/");
        }
    }, []); // Remove router dependency to prevent re-renders

    const handleLogout = () => {
        localStorage.removeItem("token");
        router.push("/");
    };

    const inventoryOverview = () => {
        router.push("/storekeeper");
    };

    const stockManagement = () => {
        router.push("/storekeeper/stock");
    };

    const suppliers = () => {
        router.push("/storekeeper/suppliers");
    };

    const reports = () => {
        router.push("/storekeeper/reports");
    };

    const reorderManagement = () => {
        router.push("/storekeeper/reorder");
    };

    const stockMovements = () => {
        router.push("/storekeeper/movements");
    };

    return (
        <div className="min-vh-100 bg-light">
            <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
                <div className="container-fluid">
                    <NavbarTitleSection onClick={inventoryOverview} />
                    <button
                        className="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#navbarNav"
                        aria-controls="navbarNav"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav me-auto">
                            <li className="nav-item dropdown">
                                <a
                                    className="nav-link dropdown-toggle"
                                    href="#"
                                    id="inventoryDropdown"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    <i className="bi bi-boxes me-2"></i>
                                    Inventory
                                </a>
                                <ul
                                    className="dropdown-menu"
                                    aria-labelledby="inventoryDropdown"
                                >
                                    <li>
                                        <a className="dropdown-item" href="#" onClick={inventoryOverview}>
                                            <i className="bi bi-speedometer2 me-2"></i>Overview
                                        </a>
                                    </li>
                                    <li>
                                        <a className="dropdown-item" href="#" onClick={stockManagement}>
                                            <i className="bi bi-box me-2"></i>Stock Management
                                        </a>
                                    </li>
                                    <li>
                                        <a className="dropdown-item" href="#" onClick={stockMovements}>
                                            <i className="bi bi-arrow-left-right me-2"></i>Stock Movements
                                        </a>
                                    </li>
                                </ul>
                            </li>
                            <li className="nav-item dropdown">
                                <a
                                    className="nav-link dropdown-toggle"
                                    href="#"
                                    id="procurementDropdown"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    <i className="bi bi-truck me-2"></i>
                                    Procurement
                                </a>
                                <ul
                                    className="dropdown-menu"
                                    aria-labelledby="procurementDropdown"
                                >
                                    <li>
                                        <a className="dropdown-item" href="#" onClick={suppliers}>
                                            <i className="bi bi-building me-2"></i>Suppliers
                                        </a>
                                    </li>
                                    <li>
                                        <a className="dropdown-item" href="#" onClick={reorderManagement}>
                                            <i className="bi bi-arrow-repeat me-2"></i>Reorder Management
                                        </a>
                                    </li>
                                </ul>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#" onClick={reports}>
                                    <i className="bi bi-bar-chart me-1"></i>Reports
                                </a>
                            </li>
                        </ul>
                        <ul className="navbar-nav">
                            <li className="nav-item dropdown">
                                <a
                                    className="nav-link dropdown-toggle"
                                    href="#"
                                    id="userDropdown"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    <i className="bi bi-person-circle me-2"></i>
                                    Profile
                                </a>
                                <ul
                                    className="dropdown-menu dropdown-menu-end"
                                    aria-labelledby="userDropdown"
                                >
                                    <li>
                                        <a className="dropdown-item" href="#" onClick={() => router.push("/profile")}>
                                            <i className="bi bi-gear me-2"></i>Settings
                                        </a>
                                    </li>
                                    <li>
                                        <hr className="dropdown-divider" />
                                    </li>
                                    <li>
                                        <a className="dropdown-item" href="#" onClick={handleLogout}>
                                            <i className="bi bi-box-arrow-right me-2"></i>Logout
                                        </a>
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
            <main className="container-fluid">
                {authError && (
                    <div className="alert alert-danger" role="alert">
                        <strong>Error:</strong> {authError.message}
                        {authError.missingPermissions && (
                            <ul>
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
    );
}
