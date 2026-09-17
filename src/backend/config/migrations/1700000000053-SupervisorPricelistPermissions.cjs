/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Grants supervisor the pricelist management permissions needed for full
 * Menu & Pricing parity with admin:
 * can_add_pricelist, can_edit_pricelist, can_delete_pricelist,
 * can_add_station_pricelist, can_edit_station_pricelist, can_delete_station_pricelist.
 */
module.exports = class SupervisorPricelistPermissions1700000000053 {
  name = "SupervisorPricelistPermissions1700000000053";

  static PERMISSIONS = [
    "can_add_pricelist",
    "can_edit_pricelist",
    "can_delete_pricelist",
    "can_add_station_pricelist",
    "can_edit_station_pricelist",
    "can_delete_station_pricelist",
  ];

  async up(queryRunner) {
    console.log("🔧 SupervisorPricelistPermissions: granting pricelist management to supervisor...");

    const [supervisorRole] = await queryRunner.query(
      "SELECT id FROM `roles` WHERE name = ?",
      ["supervisor"],
    );
    if (!supervisorRole) {
      console.warn("  ⚠️  supervisor role not found — skipping");
      return;
    }

    for (const permName of SupervisorPricelistPermissions1700000000053.PERMISSIONS) {
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

    console.log("✅ SupervisorPricelistPermissions done.");
  }

  async down(queryRunner) {
    const [supervisorRole] = await queryRunner.query(
      "SELECT id FROM `roles` WHERE name = ?",
      ["supervisor"],
    );
    if (!supervisorRole) return;

    for (const permName of SupervisorPricelistPermissions1700000000053.PERMISSIONS) {
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
