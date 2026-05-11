import { RouteEntry, BreadcrumbItem, sortRoutes } from "../hooks/useNavigation";

// ─── SUPERVISOR ────────────────────────────────────────────────────────────────

export const SUPERVISOR_DEFAULT_BREADCRUMB: BreadcrumbItem = { label: "Dashboard", path: "/supervisor" };

const DS: BreadcrumbItem = SUPERVISOR_DEFAULT_BREADCRUMB;
const BILLS_MGMT: BreadcrumbItem = { label: "Bills Management", path: "/supervisor/bills" };
const MENU_PRICING_SUP: BreadcrumbItem = { label: "Menu & Pricing", path: "/supervisor/menu" };
const STATIONS_SUP: BreadcrumbItem = { label: "Stations", path: "/supervisor/station" };
const SUPPLIERS_SUP: BreadcrumbItem = { label: "Suppliers", path: "/storekeeper/suppliers" };
const INVENTORY_SUP: BreadcrumbItem = { label: "Inventory", path: "/storekeeper" };
const REPORTS_SUP: BreadcrumbItem = { label: "Reports", path: "/admin/reports" };

export const supervisorRoutes: RouteEntry[] = sortRoutes([
  // Bills
  { pattern: "/supervisor/quantity-change-requests", activeItem: "change-requests", expandedMenuIds: ["bills"], breadcrumbs: [DS, BILLS_MGMT] },
  { pattern: "/supervisor/bills/change-requests", activeItem: "change-requests", expandedMenuIds: ["bills"], breadcrumbs: [DS, BILLS_MGMT] },
  { pattern: "/supervisor/bills/settings", activeItem: "bill-settings", expandedMenuIds: ["bills"], breadcrumbs: [DS, BILLS_MGMT] },
  { pattern: "/supervisor/void-requests", activeItem: "change-requests", expandedMenuIds: ["bills"], breadcrumbs: [DS, BILLS_MGMT] },
  { pattern: "/supervisor/reopened-bills", activeItem: "reopened-bills", expandedMenuIds: ["bills"], breadcrumbs: [DS, BILLS_MGMT] },
  { pattern: "/home/cashier/bills", activeItem: "bills-manage", expandedMenuIds: ["bills"], breadcrumbs: [DS, BILLS_MGMT, { label: "Process Bills", path: "/home/cashier/bills" }] },
  { pattern: "/home/billing", activeItem: "bills-create", expandedMenuIds: ["bills"], breadcrumbs: [DS, BILLS_MGMT, { label: "Create Bill", path: "/home/billing" }] },
  { pattern: "/supervisor/bills", activeItem: "bills-manage", expandedMenuIds: ["bills"], breadcrumbs: [DS, BILLS_MGMT] },
  // Menu & Pricing
  { pattern: "/supervisor/menu/recipes", activeItem: "menu-recipes", expandedMenuIds: ["menu-pricing"], breadcrumbs: [DS, MENU_PRICING_SUP, { label: "Recipes", path: "/supervisor/menu/recipes" }] },
  { pattern: "/supervisor/menu/pricelist", activeItem: "menu-pricelist", expandedMenuIds: ["menu-pricing"], breadcrumbs: [DS, MENU_PRICING_SUP] },
  { pattern: "/supervisor/menu/category", activeItem: "menu-category", expandedMenuIds: ["menu-pricing"], breadcrumbs: [DS, MENU_PRICING_SUP] },
  { pattern: "/supervisor/menu", activeItem: "", expandedMenuIds: ["menu-pricing"], breadcrumbs: [DS, MENU_PRICING_SUP] },
  // Production
  { pattern: "/supervisor/production", activeItem: "production-issuing", expandedMenuIds: ["production"], breadcrumbs: [DS, { label: "Production", path: "/supervisor/production" }] },
  // Stations
  { pattern: "/supervisor/station/user", activeItem: "station-users", expandedMenuIds: ["stations"], breadcrumbs: [DS, STATIONS_SUP, { label: "Station Users", path: "/supervisor/station/user" }] },
  { pattern: "/admin/station/user", activeItem: "station-users", expandedMenuIds: ["stations"], breadcrumbs: [DS, STATIONS_SUP, { label: "Station Users", path: "/supervisor/station/user" }] },
  { pattern: "/supervisor/station", activeItem: "stations-overview", expandedMenuIds: ["stations"], breadcrumbs: [DS, STATIONS_SUP, { label: "Overview", path: "/supervisor/station" }] },
  { pattern: "/admin/station", activeItem: "stations-overview", expandedMenuIds: ["stations"], breadcrumbs: [DS, STATIONS_SUP, { label: "Overview", path: "/supervisor/station" }] },
  // Expenses
  { pattern: "/supervisor/expenses", activeItem: "expenses", expandedMenuIds: [], breadcrumbs: [DS, { label: "Expenses", path: "/supervisor/expenses" }] },
  // Inventory (storekeeper paths accessed from supervisor)
  { pattern: "/storekeeper/inventory/transactions", activeItem: "inventory-transactions", expandedMenuIds: ["inventory"], breadcrumbs: [DS, INVENTORY_SUP, { label: "Transactions", path: "/storekeeper/inventory/transactions" }] },
  { pattern: "/storekeeper/stock", activeItem: "inventory-list", expandedMenuIds: ["inventory"], breadcrumbs: [DS, INVENTORY_SUP, { label: "Inventory List", path: "/storekeeper/stock" }] },
  // Suppliers (storekeeper paths accessed from supervisor)
  { pattern: "/storekeeper/suppliers/transactions", activeItem: "suppliers-transactions", expandedMenuIds: ["suppliers"], breadcrumbs: [DS, SUPPLIERS_SUP, { label: "Suppliers", path: "/storekeeper/suppliers" }] },
  { pattern: "/storekeeper/purchase-orders", activeItem: "suppliers-purchase-orders", expandedMenuIds: ["suppliers"], breadcrumbs: [DS, SUPPLIERS_SUP, { label: "Purchase Orders", path: "/storekeeper/purchase-orders" }] },
  { pattern: "/storekeeper/suppliers", activeItem: "suppliers-list", expandedMenuIds: ["suppliers"], breadcrumbs: [DS, SUPPLIERS_SUP, { label: "Suppliers", path: "/storekeeper/suppliers" }] },
  { pattern: "/storekeeper", activeItem: "", expandedMenuIds: ["inventory"], breadcrumbs: [DS, INVENTORY_SUP] },
  // Reports
  { pattern: "/admin/reports/invoices-pending-bills", activeItem: "reports-invoices-pending-bills", expandedMenuIds: ["reports"], breadcrumbs: [DS, REPORTS_SUP, { label: "Invoices & Pending Bills", path: "/admin/reports/invoices-pending-bills" }] },
  { pattern: "/admin/reports/production-stock-revenue", activeItem: "reports-production-stock-revenue", expandedMenuIds: ["reports"], breadcrumbs: [DS, REPORTS_SUP, { label: "Production/Stock Revenue", path: "/admin/reports/production-stock-revenue" }] },
  { pattern: "/admin/reports/items-sold-count", activeItem: "reports-items-sold-count", expandedMenuIds: ["reports"], breadcrumbs: [DS, REPORTS_SUP, { label: "Items Sold Count", path: "/admin/reports/items-sold-count" }] },
  { pattern: "/admin/reports/sales-revenue", activeItem: "reports-sales-revenue", expandedMenuIds: ["reports"], breadcrumbs: [DS, REPORTS_SUP, { label: "Sales Revenue", path: "/admin/reports/sales-revenue" }] },
  { pattern: "/admin/reports/bill-payments", activeItem: "reports-bill-payments", expandedMenuIds: ["reports"], breadcrumbs: [DS, REPORTS_SUP, { label: "Bill Payments", path: "/admin/reports/bill-payments" }] },
  { pattern: "/admin/reports/voided-items", activeItem: "reports-voided-items", expandedMenuIds: ["reports"], breadcrumbs: [DS, REPORTS_SUP, { label: "Voided Items", path: "/admin/reports/voided-items" }] },
  { pattern: "/admin/reports/expenditure", activeItem: "reports-expenditure", expandedMenuIds: ["reports"], breadcrumbs: [DS, REPORTS_SUP, { label: "Expenditure", path: "/admin/reports/expenditure" }] },
  { pattern: "/admin/reports/purchase-orders", activeItem: "reports-purchase-orders", expandedMenuIds: ["reports"], breadcrumbs: [DS, REPORTS_SUP, { label: "Purchase Orders", path: "/admin/reports/purchase-orders" }] },
  { pattern: "/admin/reports/pnl", activeItem: "reports-pnl", expandedMenuIds: ["reports"], breadcrumbs: [DS, REPORTS_SUP, { label: "Profit & Loss", path: "/admin/reports/pnl" }] },
  { pattern: "/admin/reports", activeItem: "reports-dashboard", expandedMenuIds: ["reports"], breadcrumbs: [DS, REPORTS_SUP] },
  { pattern: "/supervisor/reports", activeItem: "reports-dashboard", expandedMenuIds: ["reports"], breadcrumbs: [DS, REPORTS_SUP] },
  // Dashboard (catch-all — shortest, always matched last)
  { pattern: "/supervisor", activeItem: "dashboard", expandedMenuIds: [], breadcrumbs: [DS] },
]);

// ─── ADMIN ─────────────────────────────────────────────────────────────────────

export const ADMIN_DEFAULT_BREADCRUMB: BreadcrumbItem = { label: "Dashboard", path: "/admin" };

const DA: BreadcrumbItem = ADMIN_DEFAULT_BREADCRUMB;
const USERS: BreadcrumbItem = { label: "Users", path: "/admin/users" };
const STATIONS_ADM: BreadcrumbItem = { label: "Stations", path: "/admin/station" };
const MENU_PRICING_ADM: BreadcrumbItem = { label: "Menu & Pricing", path: "/admin/menu" };
const SUPPLIERS_ADM: BreadcrumbItem = { label: "Suppliers", path: "/storekeeper/suppliers" };
const INVENTORY_ADM: BreadcrumbItem = { label: "Inventory", path: "/storekeeper" };
const REPORTS_ADM: BreadcrumbItem = { label: "Reports", path: "/admin/reports" };

export const adminRoutes: RouteEntry[] = sortRoutes([
  // Users
  { pattern: "/admin/users/module-settings", activeItem: "users-module-settings", expandedMenuIds: ["users"], breadcrumbs: [DA, USERS, { label: "Module Settings", path: "/admin/users/module-settings" }] },
  { pattern: "/admin/users/permission", activeItem: "users-permission", expandedMenuIds: ["users"], breadcrumbs: [DA, USERS, { label: "Roles & Permissions", path: "/admin/users/permission" }] },
  { pattern: "/admin/users/view", activeItem: "users-view", expandedMenuIds: ["users"], breadcrumbs: [DA, USERS, { label: "View Users", path: "/admin/users/view" }] },
  // Stations
  { pattern: "/admin/station/user", activeItem: "station-users", expandedMenuIds: ["stations"], breadcrumbs: [DA, STATIONS_ADM, { label: "Station Users", path: "/admin/station/user" }] },
  { pattern: "/admin/station", activeItem: "stations-overview", expandedMenuIds: ["stations"], breadcrumbs: [DA, STATIONS_ADM, { label: "Overview", path: "/admin/station" }] },
  // Menu & Pricing
  { pattern: "/admin/menu/recipes", activeItem: "menu-recipes", expandedMenuIds: ["menu-pricing"], breadcrumbs: [DA, MENU_PRICING_ADM, { label: "Recipes", path: "/admin/menu/recipes" }] },
  { pattern: "/admin/menu/pricelist", activeItem: "menu-pricelist", expandedMenuIds: ["menu-pricing"], breadcrumbs: [DA, MENU_PRICING_ADM, { label: "Pricelists", path: "/admin/menu/pricelist" }] },
  { pattern: "/admin/menu/category", activeItem: "menu-category", expandedMenuIds: ["menu-pricing"], breadcrumbs: [DA, MENU_PRICING_ADM, { label: "Categories", path: "/admin/menu/category" }] },
  // Production
  { pattern: "/admin/production", activeItem: "production-issuing", expandedMenuIds: ["production"], breadcrumbs: [DA, { label: "Production", path: "/admin/production" }, { label: "Issue Production", path: "/admin/production" }] },
  // Bills
  { pattern: "/admin/bill", activeItem: "bills", expandedMenuIds: [], breadcrumbs: [DA, { label: "Bill", path: "/admin/bill" }] },
  // Expenses
  { pattern: "/admin/expenses", activeItem: "expenses", expandedMenuIds: [], breadcrumbs: [DA, { label: "Expenses", path: "/admin/expenses" }] },
  // Suppliers (storekeeper paths)
  { pattern: "/storekeeper/suppliers/transactions", activeItem: "suppliers-transactions", expandedMenuIds: ["suppliers"], breadcrumbs: [DA, SUPPLIERS_ADM, { label: "Supplier payments", path: "/storekeeper/suppliers/transactions" }] },
  { pattern: "/storekeeper/purchase-orders", activeItem: "suppliers-purchase-orders", expandedMenuIds: ["suppliers"], breadcrumbs: [DA, SUPPLIERS_ADM, { label: "Purchase Orders", path: "/storekeeper/purchase-orders" }] },
  { pattern: "/storekeeper/suppliers", activeItem: "suppliers-list", expandedMenuIds: ["suppliers"], breadcrumbs: [DA, SUPPLIERS_ADM, { label: "Suppliers", path: "/storekeeper/suppliers" }] },
  // Inventory (storekeeper paths)
  { pattern: "/storekeeper/inventory/transactions", activeItem: "inventory-transactions", expandedMenuIds: ["inventory"], breadcrumbs: [DA, INVENTORY_ADM, { label: "Transactions", path: "/storekeeper/inventory/transactions" }] },
  { pattern: "/storekeeper/stock", activeItem: "inventory-list", expandedMenuIds: ["inventory"], breadcrumbs: [DA, INVENTORY_ADM, { label: "Inventory List", path: "/storekeeper/stock" }] },
  { pattern: "/storekeeper", activeItem: "", expandedMenuIds: ["inventory"], breadcrumbs: [DA, INVENTORY_ADM] },
  // Reports
  { pattern: "/admin/reports/invoices-pending-bills", activeItem: "reports-invoices-pending-bills", expandedMenuIds: ["reports"], breadcrumbs: [DA, REPORTS_ADM, { label: "Invoices & Pending Bills", path: "/admin/reports/invoices-pending-bills" }] },
  { pattern: "/admin/reports/production-stock-revenue", activeItem: "reports-production-stock-revenue", expandedMenuIds: ["reports"], breadcrumbs: [DA, REPORTS_ADM, { label: "Production/Stock Revenue", path: "/admin/reports/production-stock-revenue" }] },
  { pattern: "/admin/reports/items-sold-count", activeItem: "reports-items-sold-count", expandedMenuIds: ["reports"], breadcrumbs: [DA, REPORTS_ADM, { label: "Items Sold Count", path: "/admin/reports/items-sold-count" }] },
  { pattern: "/admin/reports/sales-revenue", activeItem: "reports-sales-revenue", expandedMenuIds: ["reports"], breadcrumbs: [DA, REPORTS_ADM, { label: "Sales Revenue", path: "/admin/reports/sales-revenue" }] },
  { pattern: "/admin/reports/bill-payments", activeItem: "reports-bill-payments", expandedMenuIds: ["reports"], breadcrumbs: [DA, REPORTS_ADM, { label: "Bill Payments", path: "/admin/reports/bill-payments" }] },
  { pattern: "/admin/reports/voided-items", activeItem: "reports-voided-items", expandedMenuIds: ["reports"], breadcrumbs: [DA, REPORTS_ADM, { label: "Voided Items", path: "/admin/reports/voided-items" }] },
  { pattern: "/admin/reports/expenditure", activeItem: "reports-expenditure", expandedMenuIds: ["reports"], breadcrumbs: [DA, REPORTS_ADM, { label: "Expenditure", path: "/admin/reports/expenditure" }] },
  { pattern: "/admin/reports/purchase-orders", activeItem: "reports-purchase-orders", expandedMenuIds: ["reports"], breadcrumbs: [DA, REPORTS_ADM, { label: "Purchase Orders", path: "/admin/reports/purchase-orders" }] },
  { pattern: "/admin/reports/pnl", activeItem: "reports-pnl", expandedMenuIds: ["reports"], breadcrumbs: [DA, REPORTS_ADM, { label: "Profit & Loss", path: "/admin/reports/pnl" }] },
  { pattern: "/admin/reports", activeItem: "reports-dashboard", expandedMenuIds: ["reports"], breadcrumbs: [DA, REPORTS_ADM] },
  // Settings & utilities
  { pattern: "/admin/settings", activeItem: "settings", expandedMenuIds: [], breadcrumbs: [DA, { label: "System Settings", path: "/admin/settings" }] },
  { pattern: "/admin/license", activeItem: "license-diagnostics", expandedMenuIds: [], breadcrumbs: [DA, { label: "License Diagnostics", path: "/admin/license" }] },
  { pattern: "/admin/logs", activeItem: "system-logs", expandedMenuIds: [], breadcrumbs: [DA, { label: "Application Logs", path: "/admin/logs" }] },
  // Dashboard (catch-all)
  { pattern: "/admin", activeItem: "dashboard", expandedMenuIds: [], breadcrumbs: [DA] },
]);

// ─── STOREKEEPER ───────────────────────────────────────────────────────────────

export const STOREKEEPER_DEFAULT_BREADCRUMB: BreadcrumbItem = { label: "Dashboard", path: "/storekeeper" };

const DSK: BreadcrumbItem = STOREKEEPER_DEFAULT_BREADCRUMB;
const INVENTORY_SK: BreadcrumbItem = { label: "Inventory", path: "/storekeeper" };
const SUPPLIERS_SK: BreadcrumbItem = { label: "Suppliers", path: "/storekeeper/suppliers" };
const PRODUCTION_SK: BreadcrumbItem = { label: "Production", path: "/storekeeper/production" };

export const storekeeperRoutes: RouteEntry[] = sortRoutes([
  // Inventory
  { pattern: "/storekeeper/inventory/transactions", activeItem: "inventory-transactions", expandedMenuIds: ["inventory"], breadcrumbs: [DSK, INVENTORY_SK, { label: "Transactions", path: "/storekeeper/inventory/transactions" }] },
  { pattern: "/storekeeper/stock", activeItem: "inventory-list", expandedMenuIds: ["inventory"], breadcrumbs: [DSK, INVENTORY_SK, { label: "Inventory List", path: "/storekeeper/stock" }] },
  // Suppliers
  { pattern: "/storekeeper/suppliers/transactions", activeItem: "suppliers-transactions", expandedMenuIds: ["suppliers"], breadcrumbs: [DSK, SUPPLIERS_SK, { label: "Supplier payments", path: "/storekeeper/suppliers/transactions" }] },
  { pattern: "/storekeeper/purchase-orders", activeItem: "suppliers-purchase-orders", expandedMenuIds: ["suppliers"], breadcrumbs: [DSK, SUPPLIERS_SK, { label: "Purchase Orders", path: "/storekeeper/purchase-orders" }] },
  { pattern: "/storekeeper/suppliers", activeItem: "suppliers-list", expandedMenuIds: ["suppliers"], breadcrumbs: [DSK, SUPPLIERS_SK, { label: "Suppliers", path: "/storekeeper/suppliers" }] },
  // Production
  { pattern: "/storekeeper/production/history", activeItem: "production-history", expandedMenuIds: ["production"], breadcrumbs: [DSK, PRODUCTION_SK, { label: "Production History", path: "/storekeeper/production/history" }] },
  { pattern: "/storekeeper/production/issue", activeItem: "production-issuing", expandedMenuIds: ["production"], breadcrumbs: [DSK, PRODUCTION_SK, { label: "Issue Production", path: "/storekeeper/production/issue" }] },
  { pattern: "/storekeeper/production", activeItem: "production-issuing", expandedMenuIds: ["production"], breadcrumbs: [DSK, PRODUCTION_SK] },
  // Reports
  { pattern: "/storekeeper/reports", activeItem: "reports", expandedMenuIds: ["reports"], breadcrumbs: [DSK, { label: "Reports", path: "/storekeeper/reports" }] },
  // Dashboard (catch-all)
  { pattern: "/storekeeper", activeItem: "dashboard", expandedMenuIds: [], breadcrumbs: [DSK] },
]);

// ─── CASHIER ───────────────────────────────────────────────────────────────────

export const CASHIER_DEFAULT_BREADCRUMB: BreadcrumbItem = { label: "Dashboard", path: "/home/cashier" };

const DC: BreadcrumbItem = CASHIER_DEFAULT_BREADCRUMB;

export const cashierRoutes: RouteEntry[] = sortRoutes([
  { pattern: "/home/cashier/bills", activeItem: "bills", expandedMenuIds: ["bills"], breadcrumbs: [DC, { label: "Bills", path: "/home/cashier/bills" }] },
  { pattern: "/home/cashier", activeItem: "dashboard", expandedMenuIds: [], breadcrumbs: [DC] },
]);

// ─── SALES ─────────────────────────────────────────────────────────────────────

export const SALES_DEFAULT_BREADCRUMB: BreadcrumbItem = { label: "Dashboard", path: "/home" };

const DH: BreadcrumbItem = SALES_DEFAULT_BREADCRUMB;

export const salesRoutes: RouteEntry[] = sortRoutes([
  { pattern: "/home/pricelist-catalog", activeItem: "pricelist-catalog", expandedMenuIds: [], breadcrumbs: [DH, { label: "Pricelist Catalog", path: "/home/pricelist-catalog" }] },
  { pattern: "/home/billing", activeItem: "bill", expandedMenuIds: [], breadcrumbs: [DH, { label: "Bill", path: "/home/billing" }] },
  { pattern: "/home/my-sales", activeItem: "my-sales", expandedMenuIds: [], breadcrumbs: [DH, { label: "My Sales", path: "/home/my-sales" }] },
  { pattern: "/home", activeItem: "dashboard", expandedMenuIds: [], breadcrumbs: [DH] },
]);