"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import SecureRoute from "../components/SecureRoute";
import NavbarTitleSection from "./NavbarTitleSection";
import { AuthError } from "../types/types";

export default function AdminLayout({
  children,
  authError
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
      router.push("/admin/station/user")
  };

  const manageInventory = () => {
      router.push("/admin/inventory/items")
  };

  const inventoryItemsDefinition = () => {
    router.push("/admin/inventory/definitions")
  };

  const restock = () => {
    router.push("/admin/inventory/restock")
  }
  
  return (
    <SecureRoute roleRequired="admin">
      <div className="container">
        <nav className="navbar navbar-expand-lg navbar-light bg-body-secondary m-0 px-2">
          <NavbarTitleSection onClick={adminPage} />
          <div className="collapse navbar-collapse">
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
                  Users
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
                  Configuration
                </a>
                <ul
                  className="dropdown-menu dropdown-menu-dark"
                  aria-labelledby="navbarDarkDropdownMenuLink"
                >
                  <li>
                    <a className="dropdown-item" href="#" onClick={manageStations}>
                      Station
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="#" onClick={manageStationStaff}>
                      Station users
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
                  Operations
                </a>
                <ul
                  className="dropdown-menu dropdown-menu-dark"
                  aria-labelledby="navbarDarkDropdownMenuLink"
                >
                  <li>
                    <a className="dropdown-item" href="#">
                      Billing
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="#">
                      Production
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="#">
                      Issuing
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
                  Menu & Pricing
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
                  Inventory
                </a>
                <ul
                  className="dropdown-menu dropdown-menu-dark"
                  aria-labelledby="navbarDarkDropdownMenuLink"
                >
                  <li>
                    <a className="dropdown-item" href="#" onClick={manageInventory}>
                      Stock Items 
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="#" onClick={inventoryItemsDefinition}>
                      Inventory definition
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="#" onClick={restock}>
                      Restock
                    </a>
                  </li>
                </ul>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#">
                  Suppliers
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#">
                  Reports
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
                  <a className="dropdown-item" href="#">
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
        <main>{children}</main>
      </div>
    </SecureRoute>
  );
}
