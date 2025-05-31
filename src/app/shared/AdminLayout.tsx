"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import SecureRoute from "../components/SecureRoute";
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
  }, [router]);

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
    <SecureRoute roleRequired="admin">
      <div>
        <nav className="navbar navbar-expand-lg navbar-light bg-body-secondary m-0 px-2 container-fluid">
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
            <ul className="navbar-nav mr-auto mt-2 mt-lg-0">
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="navbarDarkDropdownMenuLink"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-people me-2"></i>Users
                </a>
                <ul
                  className="dropdown-menu dropdown-menu-dark"
                  aria-labelledby="navbarDarkDropdownMenuLink"
                >
                  <li>
                    <a className="dropdown-item" href="#" onClick={viewUsers}>
                      View
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="#"
                      onClick={rolesAndPermissions}
                    >
                      Roles and Permissions
                    </a>
                  </li>
                </ul>
              </li>

              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="navbarDarkDropdownMenuLink"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-gear me-2"></i>Configuration
                </a>
                <ul
                  className="dropdown-menu dropdown-menu-dark"
                  aria-labelledby="navbarDarkDropdownMenuLink"
                >
                  <li>
                    <a
                      className="dropdown-item"
                      href="#"
                      onClick={manageStations}
                    >
                      Station
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="#"
                      onClick={manageStationStaff}
                    >
                      Station users
                    </a>
                  </li>
                </ul>
              </li>
              {/* Dropdown for Menu & Pricing */}
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="menuAndPricing"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-list-ul me-2"></i>Menu & Pricing
                </a>
                <ul
                  className="dropdown-menu dropdown-menu-dark"
                  aria-labelledby="menuAndPricing"
                >
                  <li>
                    <a
                      className="dropdown-item"
                      href="#"
                      onClick={manageCategory}
                    >
                      Category
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="#"
                      onClick={manageGroupItems}
                    >
                      Group Items
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="#"
                      onClick={managePricelist}
                    >
                      Pricelist
                    </a>
                  </li>
                </ul>
              </li>

              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="navbarDarkDropdownMenuLink"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-box-seam me-2"></i>Production
                </a>
                <ul
                  className="dropdown-menu dropdown-menu-dark"
                  aria-labelledby="navbarDarkDropdownMenuLink"
                >
                  <li>
                    <a
                      className="dropdown-item"
                      href="#"
                      onClick={manageProduction}
                    >
                      Stock Menu Items
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="#"
                      onClick={productionItemDefinition}
                    >
                      Ratio definition
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="#"
                      onClick={dailyProduction}
                    >
                      Daily Production
                    </a>
                  </li>

                  <li>
                    <a className="dropdown-item" href="#" onClick={issue}>
                      Issuing
                    </a>
                  </li>
                </ul>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#">
                  <i className="bi bi-truck me-2"></i>Suppliers
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#">
                  <i className="bi bi-bar-chart me-2"></i>Reports
                </a>
              </li>
            </ul>

            <div className="dropdown ms-auto">
              <button
                className="btn btn-secondary dropdown-toggle"
                type="button"
                id="userActionsDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Profile
              </button>
              <ul
                className="dropdown-menu dropdown-menu-end"
                aria-labelledby="userActionsDropdown"
              >
                <li>
                  <a className="dropdown-item" href="/profile">
                    Settings
                  </a>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button className="dropdown-item" onClick={handleLogout}>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </nav>
        {authError && (
          <div className="alert alert-danger">
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
        <main className="container">{children}</main>
      </div>
    </SecureRoute>
  );
}
