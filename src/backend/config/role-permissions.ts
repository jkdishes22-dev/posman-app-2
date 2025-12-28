// Role-based permission mapping for ACL system
export const ROLE_PERMISSIONS = {
    admin: [
        // System Management
        "can_view_role",
        "can_add_role",
        "can_edit_role",
        "can_delete_role",
        "can_view_permission",
        "can_add_permission",
        "can_edit_permission",
        "can_delete_permission",
        "can_view_user",
        "can_add_user",
        "can_edit_user",
        "can_delete_user",
        "can_view_station",
        "can_add_station",
        "can_edit_station",
        "can_delete_station",
        "can_view_user_station",
        "can_add_user_station",
        "can_edit_user_station",
        "can_delete_user_station",
        "can_view_role_permission",
        "can_add_role_permission",
        "can_edit_role_permission",
        "can_delete_role_permission",
        "can_view_permission_scope",
        "can_edit_permission_scope",
        "can_delete_permission_scope",
        "can_view_pricelist",
        "can_add_pricelist",
        "can_edit_pricelist",
        "can_delete_pricelist",
        "can_view_category",
        "can_add_category",
        "can_edit_category",
        "can_delete_category",
        "can_view_item",
        "can_add_item",
        "can_edit_item",
        "can_delete_item",
        "can_view_station_pricelist",
        "can_add_station_pricelist",
        "can_edit_station_pricelist",
        "can_delete_station_pricelist",
        // Read-only access to business data
        "can_view_bill",
        "can_view_bill_item",
        "can_view_bill_payment",
        "can_view_inventory",
        "can_edit_inventory",
        "can_view_payment",
        "can_view_purchase_order",
        // Production permissions (read-only)
        "can_view_production_history"
    ],

    supervisor: [
        // Sales permissions
        "can_view_bill",
        "can_add_bill",
        "can_edit_bill",
        "can_view_bill_item",
        "can_add_bill_item",
        "can_edit_bill_item",
        "can_delete_bill_item",
        "can_view_bill_payment",
        "can_add_bill_payment",
        "can_edit_bill_payment",
        "can_view_payment",
        "can_add_payment",
        "can_edit_payment",
        "can_view_pricelist",
        "can_view_category",
        "can_view_item",
        "can_view_station",
        "can_view_user_station",
        // Cashier permissions
        "can_delete_bill_payment",
        "can_delete_payment",
        // Storekeeper permissions
        "can_view_inventory",
        "can_add_inventory",
        "can_edit_inventory",
        "can_delete_inventory",
        "can_add_item",
        "can_edit_item",
        "can_delete_item",
        "can_add_category",
        "can_edit_category",
        "can_delete_category",
        "can_view_supplier",
        "can_add_supplier",
        "can_edit_supplier",
        "can_delete_supplier",
        "can_view_supplier_payment",
        "can_add_supplier_payment",
        "can_edit_supplier_payment",
        "can_delete_supplier_payment",
        "can_view_purchase_order",
        "can_add_purchase_order",
        "can_edit_purchase_order",
        "can_delete_purchase_order",
        "can_receive_purchase_order",
        // Production permissions
        "can_issue_production",
        "can_view_production_history",
        // Additional supervisor permissions
        "can_edit_station",
        "can_view_station_pricelist",
        "can_edit_user_station"
    ],

    sales: [
        // Billing and customer operations
        "can_view_bill",
        "can_add_bill",
        "can_edit_bill",
        "can_view_bill_item",
        "can_add_bill_item",
        "can_edit_bill_item",
        "can_delete_bill_item",
        "can_view_bill_payment",
        "can_add_bill_payment",
        "can_edit_bill_payment",
        "can_view_payment",
        "can_add_payment",
        "can_edit_payment",
        "can_view_pricelist",
        "can_view_category",
        "can_view_item",
        "can_view_station",
        "can_view_user_station"
    ],

    cashier: [
        // Financial operations
        "can_view_bill",
        "can_view_bill_item",
        "can_view_bill_payment",
        "can_add_bill_payment",
        "can_edit_bill_payment",
        "can_delete_bill_payment",
        "can_view_payment",
        "can_add_payment",
        "can_edit_payment",
        "can_delete_payment",
        "can_view_station",
        "can_view_user_station"
    ],

    storekeeper: [
        // Inventory management
        "can_view_inventory",
        "can_add_inventory",
        "can_edit_inventory",
        "can_delete_inventory",
        "can_view_item",
        "can_add_item",
        "can_edit_item",
        "can_delete_item",
        "can_view_category",
        "can_add_category",
        "can_edit_category",
        "can_delete_category",
        "can_view_station",
        "can_view_user_station",
        "can_view_supplier",
        "can_add_supplier",
        "can_edit_supplier",
        "can_delete_supplier",
        "can_view_supplier_payment",
        "can_add_supplier_payment",
        "can_edit_supplier_payment",
        "can_delete_supplier_payment",
        "can_view_purchase_order",
        "can_add_purchase_order",
        "can_edit_purchase_order",
        "can_delete_purchase_order",
        "can_receive_purchase_order",
        // Production permissions
        "can_issue_production",
        "can_view_production_history"
    ]
};

// Permission categories for UI organization
export const PERMISSION_CATEGORIES = {
    system: [
        "can_view_role",
        "can_add_role",
        "can_edit_role",
        "can_delete_role",
        "can_view_permission",
        "can_add_permission",
        "can_edit_permission",
        "can_delete_permission",
        "can_view_user",
        "can_add_user",
        "can_edit_user",
        "can_delete_user"
    ],
    billing: [
        "can_view_bill",
        "can_add_bill",
        "can_edit_bill",
        "can_delete_bill",
        "can_view_bill_item",
        "can_add_bill_item",
        "can_edit_bill_item",
        "can_delete_bill_item",
        "can_view_bill_payment",
        "can_add_bill_payment",
        "can_edit_bill_payment",
        "can_delete_bill_payment"
    ],
    financial: [
        "can_view_payment",
        "can_add_payment",
        "can_edit_payment",
        "can_delete_payment"
    ],
    inventory: [
        "can_view_inventory",
        "can_add_inventory",
        "can_edit_inventory",
        "can_delete_inventory",
        "can_view_item",
        "can_add_item",
        "can_edit_item",
        "can_delete_item",
        "can_view_category",
        "can_add_category",
        "can_edit_category",
        "can_delete_category",
        "can_view_supplier",
        "can_add_supplier",
        "can_edit_supplier",
        "can_delete_supplier",
        "can_view_supplier_payment",
        "can_add_supplier_payment",
        "can_edit_supplier_payment",
        "can_delete_supplier_payment",
        "can_view_purchase_order",
        "can_add_purchase_order",
        "can_edit_purchase_order",
        "can_delete_purchase_order",
        "can_receive_purchase_order",
        "can_issue_production",
        "can_view_production_history"
    ],
    stations: [
        "can_view_station",
        "can_add_station",
        "can_edit_station",
        "can_delete_station",
        "can_view_user_station",
        "can_add_user_station",
        "can_edit_user_station",
        "can_delete_user_station",
        "can_view_station_pricelist",
        "can_add_station_pricelist",
        "can_edit_station_pricelist",
        "can_delete_station_pricelist"
    ],
    pricelists: [
        "can_view_pricelist",
        "can_add_pricelist",
        "can_edit_pricelist",
        "can_delete_pricelist"
    ]
};

// Role hierarchy for inheritance
export const ROLE_HIERARCHY = {
    admin: ["supervisor", "sales", "cashier", "storekeeper"],
    supervisor: ["sales", "cashier", "storekeeper"],
    sales: [],
    cashier: [],
    storekeeper: []
};

// Check if a role has a specific permission
export function hasPermission(userRoles: string[], permission: string): boolean {
    for (const role of userRoles) {
        if (ROLE_PERMISSIONS[role]?.includes(permission)) {
            return true;
        }

        // Check inherited permissions from role hierarchy
        const inheritedRoles = ROLE_HIERARCHY[role] || [];
        for (const inheritedRole of inheritedRoles) {
            if (ROLE_PERMISSIONS[inheritedRole]?.includes(permission)) {
                return true;
            }
        }
    }
    return false;
}

// Get all permissions for a role (including inherited)
export function getRolePermissions(role: string): string[] {
    const directPermissions = ROLE_PERMISSIONS[role] || [];
    const inheritedRoles = ROLE_HIERARCHY[role] || [];

    let allPermissions = [...directPermissions];

    for (const inheritedRole of inheritedRoles) {
        const inheritedPermissions = ROLE_PERMISSIONS[inheritedRole] || [];
        allPermissions = [...allPermissions, ...inheritedPermissions];
    }

    // Remove duplicates
    return [...new Set(allPermissions)];
}

// Get menu items based on role
export function getMenuItems(role: string): any[] {
    const baseMenu = {
        admin: [
            { name: "Dashboard", path: "/admin", icon: "bi-speedometer2" },
            { name: "User Management", path: "/admin/users", icon: "bi-people" },
            { name: "Stations", path: "/admin/station", icon: "bi-building" },
            { name: "Menu Management", path: "/admin/menu", icon: "bi-list-ul" },
            { name: "System Settings", path: "/admin/settings", icon: "bi-gear" }
        ],
        supervisor: [
            { name: "Dashboard", path: "/supervisor", icon: "bi-graph-up" },
            { name: "Sales Management", path: "/supervisor/sales", icon: "bi-receipt" },
            { name: "Station Management", path: "/supervisor/stations", icon: "bi-building" },
            { name: "Void Requests", path: "/supervisor/void-requests", icon: "bi-exclamation-triangle" },
            { name: "Reports", path: "/supervisor/reports", icon: "bi-bar-chart" },
            { name: "Inventory Overview", path: "/supervisor/inventory", icon: "bi-boxes" }
        ],
        sales: [
            { name: "Dashboard", path: "/sales", icon: "bi-speedometer2" },
            { name: "Billing", path: "/sales/billing", icon: "bi-receipt" },
            { name: "Menu", path: "/sales/menu", icon: "bi-list-ul" },
            { name: "Customer Service", path: "/sales/customers", icon: "bi-person" },
            { name: "Reports", path: "/sales/reports", icon: "bi-bar-chart" }
        ],
        cashier: [
            { name: "Dashboard", path: "/cashier", icon: "bi-speedometer2" },
            { name: "Payment Processing", path: "/cashier/payments", icon: "bi-credit-card" },
            { name: "Cash Management", path: "/cashier/cash", icon: "bi-cash" },
            { name: "Financial Reports", path: "/cashier/reports", icon: "bi-bar-chart" }
        ],
        storekeeper: [
            { name: "Dashboard", path: "/storekeeper", icon: "bi-speedometer2" },
            { name: "Inventory", path: "/storekeeper/inventory", icon: "bi-boxes" },
            { name: "Stock Management", path: "/storekeeper/stock", icon: "bi-arrow-left-right" },
            { name: "Suppliers", path: "/storekeeper/suppliers", icon: "bi-truck" },
            { name: "Reports", path: "/storekeeper/reports", icon: "bi-bar-chart" }
        ]
    };

    return baseMenu[role] || [];
}
