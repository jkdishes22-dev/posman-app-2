"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import NavbarTitleSection from "./NavbarTitleSection";
import { AuthError } from "../types/types";

export default function AdminLayout({
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

  const viewUsers = () => {
    router.push("/admin/users/view");
  };

  const rolesAndPermissions = () => {
    router.push("/admin/users/permission");
  };

  const adminPage = () => {
    router.push("/admin");
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

  const manageStations = () => {
    router.push("/admin/station");
  };

  const manageStationStaff = () => {
    router.push("/admin/station/user");
  };

  const manageProduction = () => {
    router.push("/admin/production/items");
  };

  const productionItemDefinition = () => {
    router.push("/admin/production/definitions");
  };

  const dailyProduction = () => {
    router.push("/admin/production");
  };

  const issue = () => {
    router.push("admin/production/restock");
  };

  return (
    <div className="admin-layout enterprise-pos">
      <nav className="navbar navbar-expand-lg navbar-enterprise">
        <div className="navbar-container">
          <NavbarTitleSection onClick={adminPage} />
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#adminNavbarSupportedContent"
            aria-controls="adminNavbarSupportedContent"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="adminNavbarSupportedContent">
            <ul className="navbar-nav">
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle nav-link-enterprise"
                  href="#"
                  id="navbarDarkDropdownMenuLink"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-people me-2"></i>Users
                </a>
                <ul
                  className="dropdown-menu dropdown-menu-enterprise"
                  aria-labelledby="navbarDarkDropdownMenuLink"
                >
                  <li>
                    <a className="dropdown-item dropdown-item-enterprise" href="#" onClick={viewUsers}>
                      <i className="bi bi-eye me-2"></i>View
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item dropdown-item-enterprise"
                      href="#"
                      onClick={rolesAndPermissions}
                    >
                      <i className="bi bi-shield-check me-2"></i>Roles and Permissions
                    </a>
                  </li>
                </ul>
              </li>

              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle nav-link-enterprise"
                  href="#"
                  id="navbarDarkDropdownMenuLink"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-gear me-2"></i>Configuration
                </a>
                <ul
                  className="dropdown-menu dropdown-menu-enterprise"
                  aria-labelledby="navbarDarkDropdownMenuLink"
                >
                  <li>
                    <a
                      className="dropdown-item dropdown-item-enterprise"
                      href="#"
                      onClick={manageStations}
                    >
                      <i className="bi bi-building me-2"></i>Station
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item dropdown-item-enterprise"
                      href="#"
                      onClick={manageStationStaff}
                    >
                      <i className="bi bi-people-fill me-2"></i>Station users
                    </a>
                  </li>
                </ul>
              </li>
              {/* Dropdown for Menu & Pricing */}
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle nav-link-enterprise"
                  href="#"
                  id="menuAndPricing"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-list-ul me-2"></i>Menu & Pricing
                </a>
                <ul
                  className="dropdown-menu dropdown-menu-enterprise"
                  aria-labelledby="menuAndPricing"
                >
                  <li>
                    <a
                      className="dropdown-item dropdown-item-enterprise"
                      href="#"
                      onClick={manageCategory}
                    >
                      <i className="bi bi-grid me-2"></i>Category
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item dropdown-item-enterprise"
                      href="#"
                      onClick={manageGroupItems}
                    >
                      <i className="bi bi-collection me-2"></i>Group Items
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item dropdown-item-enterprise"
                      href="#"
                      onClick={managePricelist}
                    >
                      <i className="bi bi-tags me-2"></i>Pricelist
                    </a>
                  </li>
                </ul>
              </li>

              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle nav-link-enterprise"
                  href="#"
                  id="navbarDarkDropdownMenuLink"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-box-seam me-2"></i>Production
                </a>
                <ul
                  className="dropdown-menu dropdown-menu-enterprise"
                  aria-labelledby="navbarDarkDropdownMenuLink"
                >
                  <li>
                    <a
                      className="dropdown-item dropdown-item-enterprise"
                      href="#"
                      onClick={manageProduction}
                    >
                      <i className="bi bi-box me-2"></i>Stock Menu Items
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item dropdown-item-enterprise"
                      href="#"
                      onClick={productionItemDefinition}
                    >
                      <i className="bi bi-calculator me-2"></i>Ratio definition
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item dropdown-item-enterprise"
                      href="#"
                      onClick={dailyProduction}
                    >
                      <i className="bi bi-calendar-day me-2"></i>Daily Production
                    </a>
                  </li>

                  <li>
                    <a className="dropdown-item dropdown-item-enterprise" href="#" onClick={issue}>
                      <i className="bi bi-arrow-up-circle me-2"></i>Issuing
                    </a>
                  </li>
                </ul>
              </li>
              <li className="nav-item">
                <a className="nav-link nav-link-enterprise" href="#">
                  <i className="bi bi-truck me-2"></i>Suppliers
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link nav-link-enterprise" href="#">
                  <i className="bi bi-bar-chart me-2"></i>Reports
                </a>
              </li>
            </ul>

            <div className="dropdown ms-auto">
              <button
                className="btn-enterprise btn-enterprise-secondary dropdown-toggle"
                type="button"
                id="userActionsDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-person-circle me-2"></i>Profile
              </button>
              <ul
                className="dropdown-menu dropdown-menu-enterprise dropdown-menu-end"
                aria-labelledby="userActionsDropdown"
              >
                <li>
                  <a className="dropdown-item dropdown-item-enterprise" href="/profile">
                    <i className="bi bi-gear me-2"></i>Settings
                  </a>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button className="dropdown-item dropdown-item-enterprise" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>
      {authError && (
        <div className="alert alert-danger alert-enterprise">
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
      <main className="main-content-enterprise">{children}</main>
    </div>
  );
}
