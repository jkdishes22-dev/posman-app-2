/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Consolidated idempotent seed: roles, scopes, permissions, admin user, role_permissions.
 * Absorbs legacy migrations 0003–0007, 0017–0018, 0022, 0028, 0033.
 */
const bcrypt = require("bcryptjs");
require("dotenv").config();

const REPORT_PERMISSION_NAMES = [
  "can_view_sales_revenue_report",
  "can_view_production_stock_revenue_report",
  "can_view_items_sold_count_report",
  "can_view_voided_items_report",
  "can_view_expenditure_report",
  "can_view_invoices_pending_bills_report",
  "can_view_purchase_orders_report",
  "can_view_pnl_report",
];

/** Baseline ROLE_PERMISSIONS from legacy 0007 (before report + reconciliation extras). */
const rolePermissionsBaseline = {
  admin: [
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
    "can_view_bill",
    "can_view_bill_item",
    "can_view_bill_payment",
    "can_view_inventory",
    "can_view_payment",
    "can_view_purchase_order",
  ],
  supervisor: [
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
    "can_delete_bill_payment",
    "can_delete_payment",
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
    "can_adjust_inventory",
    "can_issue_production",
    "can_view_production_history",
    "can_edit_station",
    "can_view_station_pricelist",
    "can_edit_user_station",
  ],
  sales: [
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
  ],
  cashier: [
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
    "can_view_user_station",
  ],
  storekeeper: [
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
    "can_adjust_inventory",
    "can_issue_production",
    "can_view_production_history",
  ],
};

function uniqueStrings(list) {
  return [...new Set(list)];
}

function buildFinalRolePermissions() {
  const reconciliation = "can_view_production_sales_reconciliation_report";
  return {
    admin: uniqueStrings([
      ...rolePermissionsBaseline.admin,
      "can_view_production_history",
      "can_edit_inventory",
      ...REPORT_PERMISSION_NAMES,
      reconciliation,
    ]),
    supervisor: uniqueStrings([
      ...rolePermissionsBaseline.supervisor,
      ...REPORT_PERMISSION_NAMES,
      reconciliation,
    ]),
    sales: [...rolePermissionsBaseline.sales],
    cashier: uniqueStrings([
      ...rolePermissionsBaseline.cashier,
      ...REPORT_PERMISSION_NAMES,
      reconciliation,
    ]),
    storekeeper: [...rolePermissionsBaseline.storekeeper],
  };
}

const SEEDED_SCOPE_NAMES = [
  "system",
  "billing",
  "financial",
  "inventory",
  "stations",
  "pricelists",
];

const SEEDED_ROLE_NAMES = [
  "admin",
  "supervisor",
  "sales",
  "cashier",
  "storekeeper",
];

/** All permission names inserted by this migration (for down()). */
const SEEDED_PERMISSION_NAMES = uniqueStrings([
  // system
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
  "can_view_role_permission",
  "can_add_role_permission",
  "can_edit_role_permission",
  "can_delete_role_permission",
  "can_view_permission_scope",
  "can_edit_permission_scope",
  "can_delete_permission_scope",
  // billing
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
  "can_delete_bill_payment",
  // financial (incl. reports)
  "can_view_payment",
  "can_add_payment",
  "can_edit_payment",
  "can_delete_payment",
  ...REPORT_PERMISSION_NAMES,
  "can_view_production_sales_reconciliation_report",
  // inventory
  "can_view_inventory",
  "can_add_inventory",
  "can_edit_inventory",
  "can_delete_inventory",
  "can_adjust_inventory",
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
  "can_view_production_history",
  // stations
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
  "can_delete_station_pricelist",
  // pricelists
  "can_view_pricelist",
  "can_add_pricelist",
  "can_edit_pricelist",
  "can_delete_pricelist",
]);

module.exports = class SeedInitialDataConsolidated1700000000001 {
  name = "SeedInitialDataConsolidated1700000000001";

  async up(queryRunner) {
    await this.seedRoles(queryRunner);
    await this.seedPermissionScopes(queryRunner);
    await this.seedPermissions(queryRunner);
    await this.seedAdminUser(queryRunner);
    await this.assignRolePermissions(queryRunner);
  }

  async seedRoles(queryRunner) {
    const roles = [
      { name: "admin", description: "System administrator with full access" },
      {
        name: "supervisor",
        description: "Supervisor with management and oversight capabilities",
      },
      {
        name: "sales",
        description: "Sales person with billing and customer service access",
      },
      {
        name: "cashier",
        description: "Cashier with payment processing capabilities",
      },
      {
        name: "storekeeper",
        description: "Storekeeper with inventory management access",
      },
    ];

    console.log("🌱 Seeding roles...");
    for (const role of roles) {
      const existingRole = await queryRunner.query(
        "SELECT id FROM `roles` WHERE `name` = ?",
        [role.name],
      );
      if (existingRole.length === 0) {
        await queryRunner.query(
          "INSERT INTO `roles` (`name`, `created_at`, `updated_at`) VALUES (?, NOW(), NULL)",
          [role.name],
        );
        console.log(`   ✅ Created role: ${role.name}`);
      } else {
        console.log(`   ⏭️  Role already exists: ${role.name}`);
      }
    }
    console.log("✅ Role seeding completed!");
  }

  async seedPermissionScopes(queryRunner) {
    const scopes = [
      {
        name: "system",
        description:
          "System management permissions (roles, users, permissions)",
      },
      { name: "billing", description: "Billing and invoice management permissions" },
      { name: "financial", description: "Financial operations and payment processing" },
      { name: "inventory", description: "Inventory, items, and category management" },
      { name: "stations", description: "Station and user-station assignment management" },
      { name: "pricelists", description: "Pricelist management permissions" },
    ];

    console.log("🌱 Seeding permission scopes...");
    for (const scope of scopes) {
      const existingScope = await queryRunner.query(
        "SELECT id FROM `permission_scope` WHERE `name` = ?",
        [scope.name],
      );
      if (existingScope.length === 0) {
        await queryRunner.query(
          "INSERT INTO `permission_scope` (`name`, `created_at`, `updated_at`) VALUES (?, NOW(), NULL)",
          [scope.name],
        );
        console.log(`   ✅ Created scope: ${scope.name}`);
      } else {
        console.log(`   ⏭️  Scope already exists: ${scope.name}`);
      }
    }
    console.log("✅ Permission scope seeding completed!");
  }

  async seedPermissions(queryRunner) {
    const scopeRows = await queryRunner.query(
      "SELECT id, name FROM `permission_scope`",
    );
    const scopeMap = {};
    for (const scope of scopeRows) {
      scopeMap[scope.name] = scope.id;
    }

    const permissionMappings = {
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
        "can_delete_user",
        "can_view_role_permission",
        "can_add_role_permission",
        "can_edit_role_permission",
        "can_delete_role_permission",
        "can_view_permission_scope",
        "can_edit_permission_scope",
        "can_delete_permission_scope",
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
        "can_delete_bill_payment",
      ],
      financial: [
        "can_view_payment",
        "can_add_payment",
        "can_edit_payment",
        "can_delete_payment",
        ...REPORT_PERMISSION_NAMES,
        "can_view_production_sales_reconciliation_report",
      ],
      inventory: [
        "can_view_inventory",
        "can_add_inventory",
        "can_edit_inventory",
        "can_delete_inventory",
        "can_adjust_inventory",
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
        "can_view_production_history",
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
        "can_delete_station_pricelist",
      ],
      pricelists: [
        "can_view_pricelist",
        "can_add_pricelist",
        "can_edit_pricelist",
        "can_delete_pricelist",
      ],
    };

    console.log("🌱 Seeding permissions...");
    let createdCount = 0;
    let updatedCount = 0;

    for (const [scopeName, permissions] of Object.entries(permissionMappings)) {
      const scopeId = scopeMap[scopeName];
      if (!scopeId) {
        console.log(`   ⚠️  Warning: Scope '${scopeName}' not found, skipping permissions`);
        continue;
      }
      for (const permissionName of permissions) {
        const existingPermission = await queryRunner.query(
          "SELECT id FROM `permissions` WHERE `name` = ?",
          [permissionName],
        );
        if (existingPermission.length === 0) {
          await queryRunner.query(
            "INSERT INTO `permissions` (`name`, `scope_id`, `created_at`, `updated_at`) VALUES (?, ?, NOW(), NULL)",
            [permissionName, scopeId],
          );
          createdCount++;
        } else {
          await queryRunner.query(
            "UPDATE `permissions` SET `scope_id` = ?, `updated_at` = NOW() WHERE `name` = ?",
            [scopeId, permissionName],
          );
          updatedCount++;
        }
      }
    }
    console.log(`   ✅ Created ${createdCount} new permissions`);
    if (updatedCount > 0) {
      console.log(`   ⏭️  Updated ${updatedCount} existing permissions with scopes`);
    }
    console.log("✅ Permission seeding completed!");
  }

  async seedAdminUser(queryRunner) {
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const adminFirstName = process.env.ADMIN_FIRST_NAME || "System";
    const adminLastName = process.env.ADMIN_LAST_NAME || "Administrator";

    console.log("🌱 Seeding admin user...");
    console.log(`   Username: ${adminUsername}`);

    const existingUser = await queryRunner.query(
      "SELECT id FROM `user` WHERE `username` = ?",
      [adminUsername],
    );
    if (existingUser.length > 0) {
      console.log(
        `   ⏭️  Admin user '${adminUsername}' already exists, skipping creation`,
      );
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminRole = await queryRunner.query(
      "SELECT id FROM `roles` WHERE `name` = ?",
      ["admin"],
    );
    if (adminRole.length === 0) {
      throw new Error("Admin role not found. Ensure roles are seeded first.");
    }
    const adminRoleId = adminRole[0].id;

    const insertResult = await queryRunner.query(
      `INSERT INTO \`user\` (
        \`username\`, \`firstName\`, \`lastName\`, \`password\`, \`status\`, \`is_locked\`, \`created_at\`, \`updated_at\`
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NULL)`,
      [
        adminUsername,
        adminFirstName,
        adminLastName,
        hashedPassword,
        "ACTIVE",
        false,
      ],
    );

    const userId = insertResult.insertId;
    await queryRunner.query(
      "INSERT INTO `user_roles` (`user_id`, `role_id`, `created_at`, `updated_at`) VALUES (?, ?, NOW(), NULL)",
      [userId, adminRoleId],
    );
    console.log(`   ✅ Created admin user: ${adminUsername}`);
    console.log(
      "   ⚠️  IMPORTANT: Change the default password immediately after first login!",
    );
    console.log(`   📝 Default password: ${adminPassword}`);
  }

  async assignRolePermissions(queryRunner) {
    const rolePermissions = buildFinalRolePermissions();
    console.log("🔗 Assigning permissions to roles...");

    const roles = await queryRunner.query("SELECT id, name FROM `roles`");
    const roleMap = {};
    for (const role of roles) {
      roleMap[role.name] = role.id;
    }

    const permissions = await queryRunner.query(
      "SELECT id, name FROM `permissions`",
    );
    const permissionMap = {};
    for (const perm of permissions) {
      permissionMap[perm.name] = perm.id;
    }

    let totalAssigned = 0;
    let totalSkipped = 0;

    for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
      const roleId = roleMap[roleName];
      if (!roleId) {
        console.log(`   ⚠️  Warning: Role '${roleName}' not found, skipping`);
        continue;
      }
      for (const permissionName of permissionNames) {
        const permissionId = permissionMap[permissionName];
        if (!permissionId) {
          console.log(
            `   ⚠️  Warning: Permission '${permissionName}' not found, skipping`,
          );
          continue;
        }
        const existing = await queryRunner.query(
          "SELECT id FROM `role_permissions` WHERE `role_id` = ? AND `permission_id` = ?",
          [roleId, permissionId],
        );
        if (existing.length === 0) {
          await queryRunner.query(
            "INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`, `updated_at`) VALUES (?, ?, NOW(), NULL)",
            [roleId, permissionId],
          );
          totalAssigned++;
        } else {
          totalSkipped++;
        }
      }
    }

    console.log(`   ✅ Assigned ${totalAssigned} new role-permission links`);
    if (totalSkipped > 0) {
      console.log(`   ⏭️  Skipped ${totalSkipped} existing role-permission links`);
    }
    console.log("✅ Role-permission assignment completed!");
  }

  async down(queryRunner) {
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    console.log("🔄 Reverting consolidated seed data...");

    await queryRunner.query("DELETE FROM `role_permissions`");

    const rolePlaceholders = SEEDED_ROLE_NAMES.map(() => "?").join(",");
    await queryRunner.query(
      `DELETE ur FROM \`user_roles\` ur
       INNER JOIN \`roles\` r ON ur.\`role_id\` = r.\`id\`
       WHERE r.\`name\` IN (${rolePlaceholders})`,
      SEEDED_ROLE_NAMES,
    );

    const userRows = await queryRunner.query(
      "SELECT id FROM `user` WHERE `username` = ?",
      [adminUsername],
    );
    if (userRows.length > 0) {
      await queryRunner.query("DELETE FROM `user` WHERE `id` = ?", [
        userRows[0].id,
      ]);
    }

    if (SEEDED_PERMISSION_NAMES.length > 0) {
      const placeholders = SEEDED_PERMISSION_NAMES.map(() => "?").join(",");
      await queryRunner.query(
        `DELETE FROM \`permissions\` WHERE \`name\` IN (${placeholders})`,
        SEEDED_PERMISSION_NAMES,
      );
    }

    const scopePlaceholders = SEEDED_SCOPE_NAMES.map(() => "?").join(",");
    await queryRunner.query(
      `DELETE FROM \`permission_scope\` WHERE \`name\` IN (${scopePlaceholders})`,
      SEEDED_SCOPE_NAMES,
    );

    await queryRunner.query(
      `DELETE FROM \`roles\` WHERE \`name\` IN (${rolePlaceholders})`,
      SEEDED_ROLE_NAMES,
    );

    console.log("✅ Consolidated seed revert completed!");
  }
};
