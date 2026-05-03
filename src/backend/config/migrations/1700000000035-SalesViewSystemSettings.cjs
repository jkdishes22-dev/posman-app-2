/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Sales role needs read-only system settings (or receipt-printer-prefs) for billing auto-print.
 * Assigns can_view_system_settings to sales if missing.
 */
module.exports = class SalesViewSystemSettings1700000000035 {
  name = "SalesViewSystemSettings1700000000035";

  async up(queryRunner) {
    console.log("🔧 SalesViewSystemSettings: assigning can_view_system_settings → sales...");

    const [role] = await queryRunner.query("SELECT id FROM `roles` WHERE name = ?", ["sales"]);
    const [perm] = await queryRunner.query("SELECT id FROM `permissions` WHERE name = ?", [
      "can_view_system_settings",
    ]);
    if (!role || !perm) {
      console.warn("  ⚠️  role or permission missing — skipping");
      return;
    }

    const link = await queryRunner.query(
      "SELECT id FROM `role_permissions` WHERE role_id = ? AND permission_id = ?",
      [role.id, perm.id],
    );
    if (link.length === 0) {
      await queryRunner.query(
        "INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES (?, ?, NOW())",
        [role.id, perm.id],
      );
      console.log("  ✅ Assigned can_view_system_settings → sales");
    } else {
      console.log("  ⏭️  sales already has can_view_system_settings");
    }

    console.log("✅ SalesViewSystemSettings done.");
  }

  async down(queryRunner) {
    const [role] = await queryRunner.query("SELECT id FROM `roles` WHERE name = ?", ["sales"]);
    const [perm] = await queryRunner.query("SELECT id FROM `permissions` WHERE name = ?", [
      "can_view_system_settings",
    ]);
    if (!role || !perm) return;
    await queryRunner.query("DELETE FROM `role_permissions` WHERE role_id = ? AND permission_id = ?", [
      role.id,
      perm.id,
    ]);
  }
};
