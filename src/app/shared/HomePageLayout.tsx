import SecureRoute from "../components/SecureRoute";
import React from "react";
import { useRouter } from "next/navigation";
import NavbarTitleSection from "./NavbarTitleSection";

export default function HomePageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const homePage = () => {
    router.push("/home");
  };

  const Bill = () => {
    router.push("/home");
  };

  const mySales = () => {
    router.push("/home/my-sales");
  };
  const postSales = () => {
    router.push("/home/post-sales");
  };
  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  return (
    <SecureRoute roleRequired="user">
      <div>
        <nav className="navbar navbar-expand-lg navbar-light bg-body-secondary m-2 px-3 container-fluid">
          <NavbarTitleSection onClick={homePage} />
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#homeNavbarSupportedContent"
            aria-controls="homeNavbarSupportedContent"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="homeNavbarSupportedContent">
            <ul className="navbar-nav mr-auto">
              <li className="nav-item active">
                <a className="nav-link" href="#" onClick={Bill}>
                  Bill |
                </a>
              </li>
              <li className="nav-item active">
                <a className="nav-link" href="#" onClick={mySales}>
                  My Sales |
                </a>
              </li>
              <li className="nav-item active">
                <a className="nav-link" href="#" onClick={postSales}>
                  Post Sales
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
        <main className="container">{children}</main>
      </div>
    </SecureRoute>
  );
}
