/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Adds can_view_logs (system scope), assigns to admin only.
 * Seeds organisation_settings for receipt header / M-Pesa footer.
 */
module.exports = class ViewLogsPermissionOrgSettings1700000000037 {
    name = "ViewLogsPermissionOrgSettings1700000000037";

    async up(queryRunner) {
        console.log("🔧 ViewLogsPermissionOrgSettings: can_view_logs + organisation_settings...");

        const [scope] = await queryRunner.query("SELECT id FROM `permission_scope` WHERE name = ?", ["system"]);
        if (!scope) {
            console.warn("  ⚠️  system scope not found — skipping");
            return;
        }

        let permRows = await queryRunner.query("SELECT id FROM `permissions` WHERE name = ?", ["can_view_logs"]);
        let permId;
        if (permRows.length === 0) {
            await queryRunner.query(
                "INSERT INTO `permissions` (`name`, `scope_id`, `created_at`) VALUES (?, ?, NOW())",
                ["can_view_logs", scope.id],
            );
            permRows = await queryRunner.query("SELECT id FROM `permissions` WHERE name = ?", ["can_view_logs"]);
        }
        permId = permRows[0].id;
        console.log("  ✅ Permission can_view_logs ready (id=%s)", permId);

        const [adminRole] = await queryRunner.query("SELECT id FROM `roles` WHERE name = ?", ["admin"]);
        if (adminRole) {
            const link = await queryRunner.query(
                "SELECT id FROM `role_permissions` WHERE role_id = ? AND permission_id = ?",
                [adminRole.id, permId],
            );
            if (link.length === 0) {
                await queryRunner.query(
                    "INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES (?, ?, NOW())",
                    [adminRole.id, permId],
                );
                console.log("  ✅ Assigned can_view_logs → admin");
            }
        }

        const orgPayload = JSON.stringify({ name: "", tagline: "", mpesa_methods: [] });
        const existing = await queryRunner.query("SELECT `key` FROM `system_settings` WHERE `key` = ?", [
            "organisation_settings",
        ]);
        if (existing.length === 0) {
            await queryRunner.query("INSERT INTO `system_settings` (`key`, `value`) VALUES (?, ?)", [
                "organisation_settings",
                orgPayload,
            ]);
            console.log("  ✅ Inserted organisation_settings");
        }

        console.log("✅ ViewLogsPermissionOrgSettings done.");
    }

    async down(queryRunner) {
        const [perm] = await queryRunner.query("SELECT id FROM `permissions` WHERE name = ?", ["can_view_logs"]);
        if (perm) {
            await queryRunner.query("DELETE FROM `role_permissions` WHERE permission_id = ?", [perm.id]);
            await queryRunner.query("DELETE FROM `permissions` WHERE id = ?", [perm.id]);
        }
        await queryRunner.query("DELETE FROM `system_settings` WHERE `key` = ?", ["organisation_settings"]);
    }
};
