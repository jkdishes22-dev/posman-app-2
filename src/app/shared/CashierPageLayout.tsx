import SecureRoute from "../components/SecureRoute";
import React from "react";
import { useRouter } from "next/navigation";
import NavbarTitleSection from "./NavbarTitleSection";

export default function CashierPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const bills = () => {
    router.push("/home/cashier/bills");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  return (
    <SecureRoute roleRequired="cashier">
      <div className="container">
        <nav className="navbar navbar-expand-lg navbar-light bg-body-secondary m-2 px-5">
          <NavbarTitleSection onClick={bills} />
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav mr-auto">
              <li className="nav-item active">
                <a className="nav-link" href="#" onClick={bills}>
                  Bills
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
        <main>{children}</main>
      </div>
    </SecureRoute>
  );
}
