"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useStation } from "../contexts/StationContext";
import LogoutButton from "../components/LogoutButton";
import StationSwitcher from "../components/StationSwitcher";
import { AuthError } from "../types/types";
import { useTooltips } from "../hooks/useTooltips";

interface AdminLayoutProps {
  children: React.ReactNode;
  authError: AuthError | null;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, authError }) => {
  useTooltips();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState("");
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ label: string, path: string }>>([]);
  const { user, logout } = useAuth();
  const { currentStation } = useStation();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Set active item and breadcrumbs based on current path
    const path = pathname;
    let activeItemId = "";
    let breadcrumbItems: Array<{ label: string, path: string }> = [];
    const expandedMenuIds: string[] = [];

    // Dashboard
    if (path.includes("/admin") && !path.includes("/admin/")) {
      activeItemId = "dashboard";
      breadcrumbItems = [{ label: "Dashboard", path: "/admin" }];
    }
    // Users section
    else if (path.includes("/admin/users")) {
      expandedMenuIds.push("users");
      if (path.includes("/admin/users/view")) {
        activeItemId = "users-view";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Users", path: "/admin/users" },
          { label: "View Users", path: "/admin/users/view" }
        ];
      } else if (path.includes("/admin/users/permission")) {
        activeItemId = "users-permission";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Users", path: "/admin/users" },
          { label: "Roles & Permissions", path: "/admin/users/permission" }
        ];
      }
    }
    // Stations section
    else if (path.includes("/admin/station")) {
      expandedMenuIds.push("stations");
      if (path.includes("/admin/station") && !path.includes("/admin/station/user")) {
        activeItemId = "stations-overview";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Stations", path: "/admin/station" },
          { label: "Overview", path: "/admin/station" }
        ];
      } else if (path.includes("/admin/station/user")) {
        activeItemId = "station-users";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Stations", path: "/admin/station" },
          { label: "Station Users", path: "/admin/station/user" }
        ];
      }
    }
    // Menu & Pricing section
    else if (path.includes("/admin/menu")) {
      expandedMenuIds.push("menu-pricing");
      if (path.includes("/admin/menu/category")) {
        activeItemId = "menu-category";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Menu & Pricing", path: "/admin/menu" },
          { label: "Categories", path: "/admin/menu/category" }
        ];
      } else if (path.includes("/admin/menu/pricelist")) {
        activeItemId = "menu-pricelist";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Menu & Pricing", path: "/admin/menu" },
          { label: "Pricelists", path: "/admin/menu/pricelist" }
        ];
      }
    }
    // Production section
    else if (path.includes("/admin/production")) {
      expandedMenuIds.push("production");
      if (path === "/admin/production" || path === "/admin/production/") {
        activeItemId = "production-issuing";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Production", path: "/admin/production" },
          { label: "Issue Production", path: "/admin/production" }
        ];
      } else if (path.includes("/admin/menu/recipes")) {
        activeItemId = "menu-recipes";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Menu & Pricing", path: "/admin/menu" },
          { label: "Recipes", path: "/admin/menu/recipes" }
        ];
      }
    }
    // Bills section
    else if (path.includes("/admin/bill")) {
      activeItemId = "bills";
      breadcrumbItems = [
        { label: "Dashboard", path: "/admin" },
        { label: "Bill", path: "/admin/bill" }
      ];
    }
    // Suppliers section
    else if (path.includes("/storekeeper") && (path.includes("/storekeeper/suppliers") || path.includes("/storekeeper/purchase-orders"))) {
      expandedMenuIds.push("suppliers");
      if (path.includes("/storekeeper/suppliers")) {
        activeItemId = "suppliers-list";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Suppliers", path: "/storekeeper/suppliers" },
          { label: "Suppliers", path: "/storekeeper/suppliers" }
        ];
      } else if (path.includes("/storekeeper/purchase-orders")) {
        activeItemId = "suppliers-purchase-orders";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Suppliers", path: "/storekeeper/suppliers" },
          { label: "Purchase Orders", path: "/storekeeper/purchase-orders" }
        ];
      }
    }
    // Inventory section
    else if (path.includes("/storekeeper")) {
      expandedMenuIds.push("inventory");
      if (path.includes("/storekeeper/inventory/transactions")) {
        activeItemId = "inventory-transactions";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Inventory", path: "/storekeeper" },
          { label: "Transactions", path: "/storekeeper/inventory/transactions" }
        ];
      } else if (path.includes("/storekeeper/stock")) {
        activeItemId = "inventory-list";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Inventory", path: "/storekeeper" },
          { label: "Inventory List", path: "/storekeeper/stock" }
        ];
      } else {
        activeItemId = "inventory-dashboard";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Inventory", path: "/storekeeper" },
          { label: "Dashboard", path: "/storekeeper" }
        ];
      }
    }
    // Reports section
    else if (path.includes("/admin/reports")) {
      expandedMenuIds.push("reports");
      if (path === "/admin/reports" || path === "/admin/reports/") {
        activeItemId = "reports-dashboard";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Reports", path: "/admin/reports" }
        ];
      } else if (path.includes("/admin/reports/sales-revenue")) {
        activeItemId = "reports-sales-revenue";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Reports", path: "/admin/reports" },
          { label: "Sales Revenue", path: "/admin/reports/sales-revenue" }
        ];
      } else if (path.includes("/admin/reports/production-stock-revenue")) {
        activeItemId = "reports-production-stock-revenue";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Reports", path: "/admin/reports" },
          { label: "Production/Stock Revenue", path: "/admin/reports/production-stock-revenue" }
        ];
      } else if (path.includes("/admin/reports/items-sold-count")) {
        activeItemId = "reports-items-sold-count";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Reports", path: "/admin/reports" },
          { label: "Items Sold Count", path: "/admin/reports/items-sold-count" }
        ];
      } else if (path.includes("/admin/reports/voided-items")) {
        activeItemId = "reports-voided-items";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Reports", path: "/admin/reports" },
          { label: "Voided Items", path: "/admin/reports/voided-items" }
        ];
      } else if (path.includes("/admin/reports/expenditure")) {
        activeItemId = "reports-expenditure";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Reports", path: "/admin/reports" },
          { label: "Expenditure", path: "/admin/reports/expenditure" }
        ];
      } else if (path.includes("/admin/reports/invoices-pending-bills")) {
        activeItemId = "reports-invoices-pending-bills";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Reports", path: "/admin/reports" },
          { label: "Invoices & Pending Bills", path: "/admin/reports/invoices-pending-bills" }
        ];
      } else if (path.includes("/admin/reports/purchase-orders")) {
        activeItemId = "reports-purchase-orders";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Reports", path: "/admin/reports" },
          { label: "Purchase Orders", path: "/admin/reports/purchase-orders" }
        ];
      } else if (path.includes("/admin/reports/pnl")) {
        activeItemId = "reports-pnl";
        breadcrumbItems = [
          { label: "Dashboard", path: "/admin" },
          { label: "Reports", path: "/admin/reports" },
          { label: "Profit & Loss", path: "/admin/reports/pnl" }
        ];
      }
    }

    setActiveItem(activeItemId);
    setBreadcrumbs(breadcrumbItems);
    setExpandedMenus(expandedMenuIds);
  }, [pathname]);

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "bi-house",
      path: "/admin",
    },
    {
      id: "users",
      label: "Users",
      icon: "bi-people",
      submenu: [
        {
          id: "users-view",
          label: "View Users",
          icon: "bi-eye",
          path: "/admin/users/view",
        },
        {
          id: "users-permission",
          label: "Roles & Permissions",
          icon: "bi-shield-check",
          path: "/admin/users/permission",
        },
      ],
    },
    {
      id: "stations",
      label: "Stations",
      icon: "bi-gear",
      submenu: [
        {
          id: "stations-overview",
          label: "Overview",
          icon: "bi-building",
          path: "/admin/station",
        },
        {
          id: "station-users",
          label: "Station Users",
          icon: "bi-people-fill",
          path: "/admin/station/user",
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
          path: "/admin/menu/category",
        },
        {
          id: "menu-recipes",
          label: "Recipes",
          icon: "bi-journal-text",
          path: "/admin/menu/recipes",
        },
        {
          id: "menu-pricelist",
          label: "Pricelists",
          icon: "bi-tags",
          path: "/admin/menu/pricelist",
        },
      ],
    },
    {
      id: "production",
      label: "Production",
      icon: "bi-box-seam",
      submenu: [
        {
          id: "production-issuing",
          label: "Issue Production",
          icon: "bi-arrow-up-circle",
          path: "/admin/production",
        },
      ],
    },
    {
      id: "bills",
      label: "Bill",
      icon: "bi-receipt",
      path: "/admin/bill",
    },
    {
      id: "suppliers",
      label: "Suppliers",
      icon: "bi-truck",
      submenu: [
        {
          id: "suppliers-list",
          label: "Suppliers",
          icon: "bi-building",
          path: "/storekeeper/suppliers",
        },
        {
          id: "suppliers-purchase-orders",
          label: "Purchase Orders",
          icon: "bi-cart-check",
          path: "/storekeeper/purchase-orders",
        },
      ],
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: "bi-boxes",
      submenu: [
        {
          id: "inventory-dashboard",
          label: "Dashboard",
          icon: "bi-speedometer2",
          path: "/storekeeper",
        },
        {
          id: "inventory-list",
          label: "Inventory List",
          icon: "bi-list-ul",
          path: "/storekeeper/stock",
        },
        {
          id: "inventory-transactions",
          label: "Transactions",
          icon: "bi-arrow-left-right",
          path: "/storekeeper/inventory/transactions",
        },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: "bi-bar-chart",
      submenu: [
        {
          id: "reports-dashboard",
          label: "Dashboard",
          icon: "bi-speedometer2",
          path: "/admin/reports",
        },
        {
          id: "reports-sales-revenue",
          label: "Sales Revenue",
          icon: "bi-currency-dollar",
          path: "/admin/reports/sales-revenue",
        },
        {
          id: "reports-production-stock-revenue",
          label: "Production/Stock Revenue",
          icon: "bi-box-seam",
          path: "/admin/reports/production-stock-revenue",
        },
        {
          id: "reports-items-sold-count",
          label: "Items Sold Count",
          icon: "bi-cart",
          path: "/admin/reports/items-sold-count",
        },
        {
          id: "reports-voided-items",
          label: "Voided Items",
          icon: "bi-exclamation-triangle",
          path: "/admin/reports/voided-items",
        },
        {
          id: "reports-expenditure",
          label: "Expenditure",
          icon: "bi-cash-stack",
          path: "/admin/reports/expenditure",
        },
        {
          id: "reports-invoices-pending-bills",
          label: "Invoices & Pending Bills",
          icon: "bi-file-earmark-text",
          path: "/admin/reports/invoices-pending-bills",
        },
        {
          id: "reports-purchase-orders",
          label: "Purchase Orders",
          icon: "bi-cart-check",
          path: "/admin/reports/purchase-orders",
        },
        {
          id: "reports-pnl",
          label: "Profit & Loss",
          icon: "bi-graph-up-arrow",
          path: "/admin/reports/pnl",
        },
      ],
    },
  ];

  const getMenuTooltip = (label: string): string => {
    const tooltips: { [key: string]: string } = {
      "Dashboard": "View admin dashboard and system overview",
      "Users": "Manage user accounts and access",
      "View Users": "View and manage system users",
      "Roles & Permissions": "Manage role-based permissions for users",
      "Stations": "Manage POS stations and their configurations",
      "Overview": "View and manage all POS stations",
      "Station Users": "Assign users to stations and manage access",
      "Menu & Pricing": "Manage menu items and pricing",
      "Categories": "Manage menu categories and organize items",
      "Recipes": "Manage composite items and their ingredients",
      "Pricelists": "Configure pricing for different stations or customer groups",
      "Production": "Manage production and inventory",
      "Issue Production": "Create a new production issue record",
      "Bill": "View and manage bills",
      "Suppliers": "Manage suppliers and purchase orders",
      "Supplier": "Manage supplier information",
      "Purchase Orders": "Create and manage purchase orders",
      "Inventory": "Manage inventory levels and transactions",
      "Inventory Dashboard": "Overview of inventory levels and alerts",
      "Inventory List": "View all inventory items and their current levels",
      "Transactions": "View all inventory movement transactions",
      "Reports": "View reports and system analytics",
    };
    return tooltips[label] || `Navigate to ${label}`;
  };

  const handleItemClick = (itemId: string, path: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    setActiveItem(itemId);
    router.push(path);
    // Focus the clicked menu item for better accessibility
    if (event?.currentTarget) {
      event.currentTarget.focus();
    }
  };

  const toggleMenu = (menuId: string) => {
    const menuItem = menuItems.find(item => item.id === menuId);

    // Check if any sub-item is currently active
    if (menuItem?.submenu) {
      const hasActiveSubItem = menuItem.submenu.some(
        subItem => activeItem === subItem.id
      );

      // Prevent collapse if a sub-item is active
      if (hasActiveSubItem && expandedMenus.includes(menuId)) {
        return; // Don't allow collapse
      }
    }

    // Normal toggle behavior
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const handleBreadcrumbClick = (path: string) => {
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
              <div className="flex-grow-1">
                <div className="fw-bold text-white">{user?.firstname} {user?.lastname}</div>
                <small className="text-muted">Administrator</small>
              </div>
            )}
            <button
              className="btn btn-outline-light ms-auto p-2"
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "6px",
                minWidth: "36px",
                minHeight: "36px"
              }}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <div className="hamburger-icon">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>
          </div>
        </div>


        {/* Separator and Navigation Label */}
        {!isCollapsed && (
          <div className="px-3 pb-2">
            <hr className="text-white-50 mb-2" />
            <div className="text-muted small fw-semibold text-uppercase">
              <i className="bi bi-list-ul me-1"></i>
              Navigation
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-grow-1 p-3" style={{ overflowY: "auto" }}>
          <ul className="nav nav-pills flex-column">
            {menuItems.map((item) => (
              <li key={item.id} className="nav-item mb-2">
                {item.submenu ? (
                  <div>
                    <button
                      className={`nav-link w-100 text-start d-flex align-items-center ${expandedMenus.includes(item.id) ? "" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleMenu(item.id);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "rgba(255,255,255,0.8)",
                        cursor: "pointer",
                      }}
                    >
                      <i className={`bi ${item.icon} me-3`}></i>
                      {!isCollapsed && <span>{item.label}</span>}
                      {!isCollapsed && (
                        <i className={`bi ${expandedMenus.includes(item.id) ? "bi-chevron-up" : "bi-chevron-down"} ms-auto`}></i>
                      )}
                    </button>
                    {expandedMenus.includes(item.id) && !isCollapsed && (
                      <ul className="nav nav-pills flex-column ms-3 mt-2">
                        {item.submenu.map((subItem) => (
                          <li key={subItem.id} className="nav-item mb-1">
                            <button
                              className={`nav-link w-100 text-start d-flex align-items-center ${activeItem === subItem.id ? "active" : ""}`}
                              onClick={(e) => handleItemClick(subItem.id, subItem.path, e)}
                              style={{
                                background: activeItem === subItem.id ? "var(--bs-primary)" : "transparent",
                                border: "none",
                                color: activeItem === subItem.id ? "white" : "rgba(255,255,255,0.8)",
                                fontSize: "0.9rem",
                                padding: "0.5rem 0.75rem",
                              }}
                            >
                              <i className={`bi ${subItem.icon} me-2`}></i>
                              {subItem.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <button
                    className={`nav-link w-100 text-start d-flex align-items-center ${activeItem === item.id ? "active" : ""}`}
                    onClick={(e) => handleItemClick(item.id, item.path, e)}
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
              <h4 className="mb-0 me-3">Dashboard</h4>
              {/* Breadcrumbs */}
              {breadcrumbs.length > 1 && (
                <nav aria-label="breadcrumb">
                  <ol className="breadcrumb mb-0">
                    {breadcrumbs.map((crumb, index) => (
                      <li key={index} className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? "active" : ""}`}>
                        {index === breadcrumbs.length - 1 ? (
                          crumb.label
                        ) : (
                          <button
                            className="btn btn-link p-0 text-decoration-none"
                            onClick={() => handleBreadcrumbClick(crumb.path)}
                            style={{ color: "var(--bs-primary)" }}
                          >
                            {crumb.label}
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
            </div>

            <div className="d-flex align-items-center">

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

export default AdminLayout;
