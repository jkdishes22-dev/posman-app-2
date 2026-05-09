"use client";

import React from "react";
import { useAuth } from "../contexts/AuthContext";

export interface PageHeaderStripProps {
  /** Title row: use `<h1 className="h4 mb-0 fw-bold">` (+ optional icon / HelpPopover with `className="text-white"`). */
  children: React.ReactNode;
  /** Right-aligned actions (buttons, links, secondary text). Prefer `variant="light"` / `btn-outline-light` on strip. */
  actions?: React.ReactNode;
  className?: string;
  showProfileMenu?: boolean;
}

export default function PageHeaderStrip({
  children,
  actions,
  className,
  showProfileMenu = true,
}: PageHeaderStripProps) {
  const { logout } = useAuth();

  return (
    <div
      className={`page-header-strip bg-primary text-white p-3 mb-4 position-relative ${className ?? ""}`.trim()}
      style={{ zIndex: 1050 }}
    >
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="min-w-0">{children}</div>
        <div className="d-flex flex-wrap gap-2 align-items-center flex-shrink-0">
          {actions ?? null}
          {showProfileMenu ? (
            <div className="dropdown">
              <button
                className="btn btn-outline-light btn-sm"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                title="Profile options"
              >
                <i className="bi bi-person-circle me-1"></i>
                Profile
              </button>
              <ul className="dropdown-menu dropdown-menu-end" style={{ zIndex: 1060 }}>
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
                  <button className="dropdown-item text-danger" onClick={() => logout()}>
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
