/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Fills in settings fields that were added after the initial seed but never backfilled:
 *
 * bill_settings (top-level key):
 *   + show_payment_on_receipt  (added with M-Pesa settlement feature)
 *   + top_n_billing_items      (added with top-N billing items feature)
 *   + top_n_lookback_days      (added with top-N billing items feature)
 *
 * system_settings JSON blob:
 *   + printer_settings.auto_print_copy_mode  (UI default "both" was never seeded)
 *   + license_warning sub-key                (read by admin settings / license page)
 */
module.exports = class SeedMissingSettingsFields1700000000041 {
    name = "SeedMissingSettingsFields1700000000041";

    async up(queryRunner) {
        console.log("🔧 SeedMissingSettingsFields: patching bill_settings and system_settings...");

        // ── bill_settings ──────────────────────────────────────────────────────────
        const billRows = await queryRunner.query(
            "SELECT `value` FROM `system_settings` WHERE `key` = 'bill_settings'"
        );
        if (billRows.length > 0) {
            const bill = JSON.parse(billRows[0].value);
            let changed = false;
            if (bill.show_payment_on_receipt === undefined) { bill.show_payment_on_receipt = true; changed = true; }
            if (bill.top_n_billing_items === undefined) { bill.top_n_billing_items = 10; changed = true; }
            if (bill.top_n_lookback_days === undefined) { bill.top_n_lookback_days = 30; changed = true; }
            if (changed) {
                await queryRunner.query(
                    "UPDATE `system_settings` SET `value` = ? WHERE `key` = 'bill_settings'",
                    [JSON.stringify(bill)]
                );
                console.log("  ✅ bill_settings: added missing fields");
            } else {
                console.log("  ⏭️  bill_settings: already up to date");
            }
        } else {
            await queryRunner.query(
                "INSERT INTO `system_settings` (`key`, `value`) VALUES ('bill_settings', ?)",
                [JSON.stringify({ show_tax_on_receipt: true, show_payment_on_receipt: true, top_n_billing_items: 10, top_n_lookback_days: 30 })]
            );
            console.log("  ✅ bill_settings: inserted fresh row");
        }

        // ── system_settings blob ───────────────────────────────────────────────────
        const sysRows = await queryRunner.query(
            "SELECT `value` FROM `system_settings` WHERE `key` = 'system_settings'"
        );
        if (sysRows.length > 0) {
            const sys = JSON.parse(sysRows[0].value);
            let changed = false;

            // auto_print_copy_mode inside printer_settings sub-key
            if (sys.printer_settings && sys.printer_settings.auto_print_copy_mode === undefined) {
                sys.printer_settings.auto_print_copy_mode = "both";
                changed = true;
            }
            // license_warning sub-key
            if (!sys.license_warning) {
                sys.license_warning = { months: 0, days: 7 };
                changed = true;
            }

            if (changed) {
                await queryRunner.query(
                    "UPDATE `system_settings` SET `value` = ? WHERE `key` = 'system_settings'",
                    [JSON.stringify(sys)]
                );
                console.log("  ✅ system_settings: patched printer_settings.auto_print_copy_mode and license_warning");
            } else {
                console.log("  ⏭️  system_settings: already up to date");
            }
        } else {
            console.log("  ⚠️  system_settings row not found — skipping blob patch (handled by SQLite migration)");
        }

        console.log("✅ SeedMissingSettingsFields done.");
    }

    async down(queryRunner) {
        // Removing seeded defaults is destructive; intentional no-op.
    }
};
