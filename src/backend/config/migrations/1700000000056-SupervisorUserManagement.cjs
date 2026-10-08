/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Grants supervisor can_view_user and can_edit_user so supervisors
 * can list users and reset passwords without needing the admin portal.
 */
module.exports = class SupervisorUserManagement1700000000056 {
  name = "SupervisorUserManagement1700000000056";

  static PERMISSIONS = ["can_view_user", "can_edit_user"];

  async up(queryRunner) {
    console.log("🔧 SupervisorUserManagement: granting user management permissions to supervisor...");

    const [supervisorRole] = await queryRunner.query(
      "SELECT id FROM `roles` WHERE name = ?",
      ["supervisor"],
    );
    if (!supervisorRole) {
      console.warn("  ⚠️  supervisor role not found — skipping");
      return;
    }

    for (const permName of SupervisorUserManagement1700000000056.PERMISSIONS) {
      const [perm] = await queryRunner.query(
        "SELECT id FROM `permissions` WHERE name = ?",
        [permName],
      );
      if (!perm) {
        console.warn(`  ⚠️  Permission '${permName}' not found — skipping`);
        continue;
      }

      const existing = await queryRunner.query(
        "SELECT id FROM `role_permissions` WHERE role_id = ? AND permission_id = ?",
        [supervisorRole.id, perm.id],
      );
      if (existing.length === 0) {
        await queryRunner.query(
          "INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES (?, ?, NOW())",
          [supervisorRole.id, perm.id],
        );
        console.log(`  ✅ Assigned ${permName} → supervisor`);
      } else {
        console.log(`  ⏭️  ${permName} already assigned — skip`);
      }
    }

    console.log("✅ SupervisorUserManagement done.");
  }

  async down(queryRunner) {
    const [supervisorRole] = await queryRunner.query(
      "SELECT id FROM `roles` WHERE name = ?",
      ["supervisor"],
    );
    if (!supervisorRole) return;

    for (const permName of SupervisorUserManagement1700000000056.PERMISSIONS) {
      const [perm] = await queryRunner.query(
        "SELECT id FROM `permissions` WHERE name = ?",
        [permName],
      );
      if (!perm) continue;
      await queryRunner.query(
        "DELETE FROM `role_permissions` WHERE role_id = ? AND permission_id = ?",
        [supervisorRole.id, perm.id],
      );
    }
  }
};
