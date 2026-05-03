/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Expense permissions were defined in code but never inserted under the financial scope.
 * Creates can_view_expense, can_add_expense, can_edit_expense and assigns them to admin + supervisor.
 */
module.exports = class ExpensePermissions1700000000034 {
  name = "ExpensePermissions1700000000034";

  async up(queryRunner) {
    console.log("🔧 ExpensePermissions: seeding expense permissions (financial scope)...");

    const [scope] = await queryRunner.query(
      "SELECT id FROM `permission_scope` WHERE name = 'financial'"
    );
    if (!scope) {
      console.warn("  ⚠️  financial scope not found — skipping");
      return;
    }

    const EXPENSE_PERMS = ["can_view_expense", "can_add_expense", "can_edit_expense"];

    for (const permName of EXPENSE_PERMS) {
      const existing = await queryRunner.query("SELECT id FROM `permissions` WHERE name = ?", [permName]);
      if (existing.length === 0) {
        await queryRunner.query(
          "INSERT INTO `permissions` (`name`, `scope_id`, `created_at`) VALUES (?, ?, NOW())",
          [permName, scope.id]
        );
        console.log(`  ✅ Created permission: ${permName}`);
      } else {
        await queryRunner.query(
          "UPDATE `permissions` SET `scope_id` = ?, `updated_at` = NOW() WHERE `name` = ?",
          [scope.id, permName]
        );
        console.log(`  ✅ Aligned scope for existing permission: ${permName}`);
      }
    }

    for (const roleName of ["admin", "supervisor"]) {
      const [role] = await queryRunner.query("SELECT id FROM `roles` WHERE name = ?", [roleName]);
      if (!role) continue;
      for (const permName of EXPENSE_PERMS) {
        const [perm] = await queryRunner.query("SELECT id FROM `permissions` WHERE name = ?", [permName]);
        if (!perm) continue;
        const link = await queryRunner.query(
          "SELECT id FROM `role_permissions` WHERE role_id = ? AND permission_id = ?",
          [role.id, perm.id]
        );
        if (link.length === 0) {
          await queryRunner.query(
            "INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES (?, ?, NOW())",
            [role.id, perm.id]
          );
          console.log(`  ✅ Assigned ${permName} → ${roleName}`);
        }
      }
    }

    console.log("✅ ExpensePermissions done.");
  }

  async down(queryRunner) {
    const EXPENSE_PERMS = ["can_view_expense", "can_add_expense", "can_edit_expense"];
    for (const permName of EXPENSE_PERMS) {
      const rows = await queryRunner.query("SELECT id FROM `permissions` WHERE name = ?", [permName]);
      if (rows.length === 0) continue;
      const permId = rows[0].id;
      await queryRunner.query("DELETE FROM `role_permissions` WHERE permission_id = ?", [permId]);
      await queryRunner.query("DELETE FROM `permissions` WHERE id = ?", [permId]);
    }
  }
};
