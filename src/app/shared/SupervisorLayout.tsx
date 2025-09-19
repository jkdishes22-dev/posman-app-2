"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import NavbarTitleSection from "./NavbarTitleSection";
import { AuthError } from "../types/types";

export default function SupervisorLayout({
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

    const supervisorPage = () => {
        router.push("/supervisor");
    };

    const manageCategory = () => {
        router.push("/admin/menu/category");
    };

    const managePricelist = () => {
        router.push("/admin/menu/pricelist");
    };

    const manageGroupItems = () => {
        router.push("/admin/menu/category/components/items/grouped");
    };

    const manageStation = () => {
        router.push("/admin/station");
    };

    const manageProduction = () => {
        router.push("/admin/production");
    };

    const voidRequests = () => {
        router.push("/supervisor/void-requests");
    };

    const reports = () => {
        router.push("/supervisor/reports");
    };

    const inventoryOverview = () => {
        router.push("/supervisor/inventory");
    };

    const salesManagement = () => {
        router.push("/supervisor/sales");
    };

    return (
        <div className="min-vh-100 bg-light">
            <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
                <div className="container-fluid">
                    <NavbarTitleSection onClick={() => { }} />
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
                                    id="navbarDarkDropdownMenuLink"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    Operations
                                </a>
                                <ul
                                    className="dropdown-menu dropdown-menu-dark"
                                    aria-labelledby="navbarDarkDropdownMenuLink"
                                >
                                    <li>
                                        <a className="dropdown-item dropdown-item-enterprise" href="#" onClick={supervisorPage}>
                                            <i className="bi bi-speedometer2 me-2"></i>Dashboard
                                        </a>
                                    </li>
                                    <li>
                                        <a className="dropdown-item dropdown-item-enterprise" href="#" onClick={salesManagement}>
                                            <i className="bi bi-receipt me-2"></i>Sales Management
                                        </a>
                                    </li>
                                    <li>
                                        <a className="dropdown-item dropdown-item-enterprise" href="#" onClick={voidRequests}>
                                            <i className="bi bi-exclamation-triangle me-2"></i>Void Requests
                                        </a>
                                    </li>
                                    <li>
                                        <a className="dropdown-item dropdown-item-enterprise" href="#" onClick={reports}>
                                            <i className="bi bi-bar-chart me-2"></i>Reports
                                        </a>
                                    </li>
                                </ul>
                            </li>
                            <li className="nav-item dropdown">
                                <a
                                    className="nav-link dropdown-toggle"
                                    href="#"
                                    id="navbarDarkDropdownMenuLink2"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    Configuration
                                </a>
                                <ul
                                    className="dropdown-menu dropdown-menu-dark"
                                    aria-labelledby="navbarDarkDropdownMenuLink2"
                                >
                                    <li>
                                        <a className="dropdown-item dropdown-item-enterprise" href="#" onClick={manageStation}>
                                            <i className="bi bi-building me-2"></i>Stations
                                        </a>
                                    </li>
                                    <li>
                                        <a className="dropdown-item dropdown-item-enterprise" href="#" onClick={managePricelist}>
                                            <i className="bi bi-tags me-2"></i>Pricelists
                                        </a>
                                    </li>
                                </ul>
                            </li>
                            <li className="nav-item dropdown">
                                <a
                                    className="nav-link dropdown-toggle"
                                    href="#"
                                    id="navbarDarkDropdownMenuLink3"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    Menu & Pricing
                                </a>
                                <ul
                                    className="dropdown-menu dropdown-menu-dark"
                                    aria-labelledby="navbarDarkDropdownMenuLink3"
                                >
                                    <li>
                                        <a className="dropdown-item dropdown-item-enterprise" href="#" onClick={manageCategory}>
                                            <i className="bi bi-list-ul me-2"></i>Categories
                                        </a>
                                    </li>
                                    <li>
                                        <a className="dropdown-item dropdown-item-enterprise" href="#" onClick={manageGroupItems}>
                                            <i className="bi bi-collection me-2"></i>Grouped Items
                                        </a>
                                    </li>
                                </ul>
                            </li>
                            <li className="nav-item dropdown">
                                <a
                                    className="nav-link dropdown-toggle"
                                    href="#"
                                    id="navbarDarkDropdownMenuLink4"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    Production
                                </a>
                                <ul
                                    className="dropdown-menu dropdown-menu-dark"
                                    aria-labelledby="navbarDarkDropdownMenuLink4"
                                >
                                    <li>
                                        <a className="dropdown-item dropdown-item-enterprise" href="#" onClick={manageProduction}>
                                            <i className="bi bi-gear me-2"></i>Production
                                        </a>
                                    </li>
                                </ul>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#" onClick={inventoryOverview}>
                                    <i className="bi bi-boxes me-1"></i>Inventory
                                </a>
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
                                    id="navbarDarkDropdownMenuLink5"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    Profile
                                </a>
                                <ul
                                    className="dropdown-menu dropdown-menu-dark"
                                    aria-labelledby="navbarDarkDropdownMenuLink5"
                                >
                                    <li>
                                        <a className="dropdown-item dropdown-item-enterprise" href="#" onClick={() => router.push("/profile")}>
                                            <i className="bi bi-person me-2"></i>View Profile
                                        </a>
                                    </li>
                                    <li>
                                        <a className="dropdown-item dropdown-item-enterprise" href="#" onClick={handleLogout}>
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
                        {authError.message}
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
