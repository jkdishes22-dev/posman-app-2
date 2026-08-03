/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Grants cashier the billing permissions it was missing:
 * can_view_pricelist, can_view_category, can_view_item,
 * can_add_bill, can_edit_bill, can_cancel_bill,
 * can_add_bill_item, can_edit_bill_item, can_delete_bill_item.
 *
 * Without these, a cashier opening /home/billing gets 403 on every
 * pricelist/category/item API call, leaving the billing UI blank.
 */
module.exports = class CashierBillingPermissions1700000000050 {
  name = "CashierBillingPermissions1700000000050";

  static PERMISSIONS = [
    "can_view_pricelist",
    "can_view_category",
    "can_view_item",
    "can_add_bill",
    "can_edit_bill",
    "can_cancel_bill",
    "can_add_bill_item",
    "can_edit_bill_item",
    "can_delete_bill_item",
  ];

  async up(queryRunner) {
    console.log("🔧 CashierBillingPermissions: granting billing permissions to cashier...");

    const [cashierRole] = await queryRunner.query(
      "SELECT id FROM `roles` WHERE name = ?",
      ["cashier"],
    );
    if (!cashierRole) {
      console.warn("  ⚠️  cashier role not found — skipping");
      return;
    }

    for (const permName of CashierBillingPermissions1700000000050.PERMISSIONS) {
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
        [cashierRole.id, perm.id],
      );
      if (existing.length === 0) {
        await queryRunner.query(
          "INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES (?, ?, NOW())",
          [cashierRole.id, perm.id],
        );
        console.log(`  ✅ Assigned ${permName} → cashier`);
      } else {
        console.log(`  ⏭️  ${permName} already assigned — skip`);
      }
    }

    console.log("✅ CashierBillingPermissions done.");
  }

  async down(queryRunner) {
    const [cashierRole] = await queryRunner.query(
      "SELECT id FROM `roles` WHERE name = ?",
      ["cashier"],
    );
    if (!cashierRole) return;

    for (const permName of CashierBillingPermissions1700000000050.PERMISSIONS) {
      const [perm] = await queryRunner.query(
        "SELECT id FROM `permissions` WHERE name = ?",
        [permName],
      );
      if (!perm) continue;
      await queryRunner.query(
        "DELETE FROM `role_permissions` WHERE role_id = ? AND permission_id = ?",
        [cashierRole.id, perm.id],
      );
    }
  }
};
