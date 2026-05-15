/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * SQLite equivalent of 1700000000041-SeedMissingSettingsFields.
 *
 * SQLite installs never received the consolidated "system_settings" JSON blob
 * (MySQL got it via 1700000000032-ConsolidateSystemSettings). This migration:
 *
 *  1. Creates the system_settings blob row from the existing separate rows
 *     (printer_settings, log_settings, admin_settings) if it does not exist,
 *     then ensures all required sub-keys are present.
 *  2. Adds auto_print_copy_mode to the standalone printer_settings row.
 *  3. Adds missing fields to bill_settings.
 */
module.exports = class SeedMissingSettingsFieldsSqlite1700000000041 {
    name = "SeedMissingSettingsFieldsSqlite1700000000041";

    async up(queryRunner) {
        console.log("🔧 SeedMissingSettingsFields (SQLite): patching system_settings and bill_settings...");

        // ── 1. Build / patch system_settings consolidated blob ────────────────────
        const sysRows = await queryRunner.query(
            "SELECT value FROM \"system_settings\" WHERE key = 'system_settings'"
        );

        if (sysRows.length === 0) {
            // Fresh SQLite install — pull defaults from the separate rows that
            // prior migrations created (printer_settings, log_settings, admin_settings).
            const printerRows = await queryRunner.query(
                "SELECT value FROM \"system_settings\" WHERE key = 'printer_settings'"
            );
            const logRows = await queryRunner.query(
                "SELECT value FROM \"system_settings\" WHERE key = 'log_settings'"
            );
            const adminRows = await queryRunner.query(
                "SELECT value FROM \"system_settings\" WHERE key = 'admin_settings'"
            );

            const printer = printerRows.length
                ? JSON.parse(printerRows[0].value)
                : { print_after_create_bill: false, printer_name: "" };
            if (!printer.auto_print_copy_mode) printer.auto_print_copy_mode = "both";

            const log = logRows.length
                ? JSON.parse(logRows[0].value)
                : { retention_days: 14 };

            const admin = adminRows.length ? JSON.parse(adminRows[0].value) : {};

            const blob = {
                printer_settings: printer,
                log_settings: log,
                db_backup: { frequency: admin.db_backup_frequency || "daily" },
                business_shifts: [],
                license_warning: { months: 0, days: 7 },
            };

            await queryRunner.query(
                "INSERT OR IGNORE INTO \"system_settings\" (\"key\", \"value\") VALUES ('system_settings', ?)",
                [JSON.stringify(blob)]
            );
            console.log("  ✅ system_settings blob created from existing separate rows");
        } else {
            // Row already exists — ensure all sub-keys are present.
            const sys = JSON.parse(sysRows[0].value);
            let changed = false;

            if (sys.printer_settings && sys.printer_settings.auto_print_copy_mode === undefined) {
                sys.printer_settings.auto_print_copy_mode = "both";
                changed = true;
            }
            if (!sys.business_shifts) { sys.business_shifts = []; changed = true; }
            if (!sys.license_warning) { sys.license_warning = { months: 0, days: 7 }; changed = true; }

            if (changed) {
                await queryRunner.query(
                    "UPDATE \"system_settings\" SET value = ? WHERE key = 'system_settings'",
                    [JSON.stringify(sys)]
                );
                console.log("  ✅ system_settings: patched missing sub-keys");
            } else {
                console.log("  ⏭️  system_settings blob: already up to date");
            }
        }

        // ── 2. Add auto_print_copy_mode to standalone printer_settings row ────────
        const printerRows = await queryRunner.query(
            "SELECT value FROM \"system_settings\" WHERE key = 'printer_settings'"
        );
        if (printerRows.length > 0) {
            const p = JSON.parse(printerRows[0].value);
            if (p.auto_print_copy_mode === undefined) {
                p.auto_print_copy_mode = "both";
                await queryRunner.query(
                    "UPDATE \"system_settings\" SET value = ? WHERE key = 'printer_settings'",
                    [JSON.stringify(p)]
                );
                console.log("  ✅ printer_settings standalone row: added auto_print_copy_mode");
            } else {
                console.log("  ⏭️  printer_settings: auto_print_copy_mode already present");
            }
        }

        // ── 3. Patch bill_settings ─────────────────────────────────────────────────
        const billRows = await queryRunner.query(
            "SELECT value FROM \"system_settings\" WHERE key = 'bill_settings'"
        );
        if (billRows.length > 0) {
            const bill = JSON.parse(billRows[0].value);
            let changed = false;
            if (bill.show_payment_on_receipt === undefined) { bill.show_payment_on_receipt = true; changed = true; }
            if (bill.top_n_billing_items === undefined) { bill.top_n_billing_items = 10; changed = true; }
            if (bill.top_n_lookback_days === undefined) { bill.top_n_lookback_days = 30; changed = true; }
            if (changed) {
                await queryRunner.query(
                    "UPDATE \"system_settings\" SET value = ? WHERE key = 'bill_settings'",
                    [JSON.stringify(bill)]
                );
                console.log("  ✅ bill_settings: added missing fields");
            } else {
                console.log("  ⏭️  bill_settings: already up to date");
            }
        } else {
            await queryRunner.query(
                "INSERT OR IGNORE INTO \"system_settings\" (\"key\", \"value\") VALUES ('bill_settings', ?)",
                [JSON.stringify({ show_tax_on_receipt: true, show_payment_on_receipt: true, top_n_billing_items: 10, top_n_lookback_days: 30 })]
            );
            console.log("  ✅ bill_settings: inserted fresh row");
        }

        console.log("✅ SeedMissingSettingsFields (SQLite) done.");
    }

    async down(queryRunner) {
        // Removing seeded defaults is destructive; intentional no-op.
    }
};
