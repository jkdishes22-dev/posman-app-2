/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Adds can_view_system_settings and can_edit_system_settings permissions (system scope).
 * Assigns view to admin, supervisor, cashier.
 * Assigns edit to admin only.
 * Sales and storekeeper intentionally excluded — they do not need settings access.
 */

module.exports = class SystemSettingsPermissions1700000000027 {
  name = "SystemSettingsPermissions1700000000027";

  async up(queryRunner) {
    console.log("🔧 SystemSettingsPermissions: seeding system settings permissions...");

    const [scope] = await queryRunner.query(
      "SELECT id FROM `permission_scope` WHERE name = 'system'"
    );
    if (!scope) {
      console.warn("  ⚠️  system scope not found — skipping");
      return;
    }

    const VIEW_PERM = "can_view_system_settings";
    const EDIT_PERM = "can_edit_system_settings";

    // 1. Seed permissions (idempotent)
    for (const permName of [VIEW_PERM, EDIT_PERM]) {
      const existing = await queryRunner.query(
        "SELECT id FROM `permissions` WHERE name = ?",
        [permName]
      );
      if (existing.length === 0) {
        await queryRunner.query(
          "INSERT INTO `permissions` (`name`, `scope_id`, `created_at`) VALUES (?, ?, NOW())",
          [permName, scope.id]
        );
        console.log(`  ✅ Created permission: ${permName}`);
      }
    }

    // 2. Assign can_view_system_settings to admin, supervisor, cashier
    const viewRoles = ["admin", "supervisor", "cashier"];
    for (const roleName of viewRoles) {
      const [role] = await queryRunner.query(
        "SELECT id FROM `roles` WHERE name = ?",
        [roleName]
      );
      if (!role) continue;
      const [perm] = await queryRunner.query(
        "SELECT id FROM `permissions` WHERE name = ?",
        [VIEW_PERM]
      );
      if (!perm) continue;
      const existing = await queryRunner.query(
        "SELECT id FROM `role_permissions` WHERE role_id = ? AND permission_id = ?",
        [role.id, perm.id]
      );
      if (existing.length === 0) {
        await queryRunner.query(
          "INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES (?, ?, NOW())",
          [role.id, perm.id]
        );
        console.log(`  ✅ Assigned ${VIEW_PERM} → ${roleName}`);
      }
    }

    // 3. Assign can_edit_system_settings to admin only
    const [adminRole] = await queryRunner.query(
      "SELECT id FROM `roles` WHERE name = 'admin'"
    );
    if (adminRole) {
      const [perm] = await queryRunner.query(
        "SELECT id FROM `permissions` WHERE name = ?",
        [EDIT_PERM]
      );
      if (perm) {
        const existing = await queryRunner.query(
          "SELECT id FROM `role_permissions` WHERE role_id = ? AND permission_id = ?",
          [adminRole.id, perm.id]
        );
        if (existing.length === 0) {
          await queryRunner.query(
            "INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES (?, ?, NOW())",
            [adminRole.id, perm.id]
          );
          console.log(`  ✅ Assigned ${EDIT_PERM} → admin`);
        }
      }
    }

    console.log("✅ SystemSettingsPermissions done.");
  }

  async down(queryRunner) {
    for (const permName of ["can_view_system_settings", "can_edit_system_settings"]) {
      const rows = await queryRunner.query(
        "SELECT id FROM `permissions` WHERE name = ?",
        [permName]
      );
      if (rows.length === 0) continue;
      const permId = rows[0].id;
      await queryRunner.query(
        "DELETE FROM `role_permissions` WHERE permission_id = ?",
        [permId]
      );
      await queryRunner.query("DELETE FROM `permissions` WHERE id = ?", [permId]);
    }
  }
};