"use client";
import Image from "next/image";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
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
    console.log("Navigating to Users page");
    router.push("/users/view");
  };

  const rolesAndPermissions = () => {
    console.log("Navigating to Users page");
    router.push("/users/permission");
  };

  const dashboardPage = () => {
    router.push("/dashboard");
  };

  return (
    <div className="container-fluid">
      <nav className="navbar navbar-expand-lg navbar-light bg-light mb-2">
        <a className="navbar-brand" href="#" onClick={dashboardPage}>
          JK Posman
          <Image
            src="/icons/JKlogo.png"
            alt="Add user"
            width={64}
            height={32}
            className="m-2"
          />
        </a>

        <div className="collapse navbar-collapse" id="navbarTogglerDemo02">
          {/* Left-aligned navigation links */}
          <ul className="navbar-nav mr-auto mt-2 mt-lg-0">
            {/* Dropdown for User & Configuration */}
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
                  <a className="dropdown-item" href="#">
                    Station
                  </a>
                </li>
                <li>
                  <a className="dropdown-item" href="#">
                    Staff
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
                  <a className="dropdown-item" href="#">
                    Items
                  </a>
                </li>
                <li>
                  <a className="dropdown-item" href="#">
                    Pricelist
                  </a>
                </li>
              </ul>
            </li>

            {/* Other Nav Items */}
            <li className="nav-item">
              <a className="nav-link" href="#">
                Financials
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#">
                Inventory
              </a>
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

          {/* Right-aligned Profile Dropdown */}
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
      <main>{children}</main>
    </div>
  );
}
