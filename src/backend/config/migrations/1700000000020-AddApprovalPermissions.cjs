/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Adds can_approve_void and can_approve_change_request permissions (billing scope)
 * and assigns them to the supervisor role.
 * Explicitly revokes them from cashier if somehow present (defensive).
 */

module.exports = class AddApprovalPermissions1700000000020 {
  name = "AddApprovalPermissions1700000000020";

  async up(queryRunner) {
    console.log("🔧 AddApprovalPermissions: seeding approval permissions...");

    const [scope] = await queryRunner.query(
      "SELECT id FROM `permission_scope` WHERE name = 'billing'"
    );
    if (!scope) {
      console.warn("  ⚠️  billing scope not found — skipping");
      return;
    }

    const APPROVAL_PERMS = ["can_approve_void", "can_approve_change_request"];

    // 1. Seed permissions (idempotent)
    for (const permName of APPROVAL_PERMS) {
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

    // 2. Assign to supervisor (idempotent)
    const [supervisorRole] = await queryRunner.query(
      "SELECT id FROM `roles` WHERE name = 'supervisor'"
    );
    if (supervisorRole) {
      for (const permName of APPROVAL_PERMS) {
        const [perm] = await queryRunner.query(
          "SELECT id FROM `permissions` WHERE name = ?",
          [permName]
        );
        if (!perm) continue;
        const existing = await queryRunner.query(
          "SELECT id FROM `role_permissions` WHERE role_id = ? AND permission_id = ?",
          [supervisorRole.id, perm.id]
        );
        if (existing.length === 0) {
          await queryRunner.query(
            "INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES (?, ?, NOW())",
            [supervisorRole.id, perm.id]
          );
          console.log(`  ✅ Assigned ${permName} → supervisor`);
        }
      }
    }

    // 3. Revoke from cashier (defensive — cashier must never approve)
    const [cashierRole] = await queryRunner.query(
      "SELECT id FROM `roles` WHERE name = 'cashier'"
    );
    if (cashierRole) {
      for (const permName of APPROVAL_PERMS) {
        const [perm] = await queryRunner.query(
          "SELECT id FROM `permissions` WHERE name = ?",
          [permName]
        );
        if (!perm) continue;
        await queryRunner.query(
          "DELETE FROM `role_permissions` WHERE role_id = ? AND permission_id = ?",
          [cashierRole.id, perm.id]
        );
      }
    }

    console.log("✅ AddApprovalPermissions done.");
  }

  async down(queryRunner) {
    for (const permName of ["can_approve_void", "can_approve_change_request"]) {
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
