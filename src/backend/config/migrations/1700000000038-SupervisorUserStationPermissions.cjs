/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Ensures supervisor role has user–station assignment permissions used by
 * Station Users (/admin/station/user): add/remove links in addition to view/edit.
 * Permissions rows are seeded by 0001 / 0005; this only adds role_permissions links.
 */
module.exports = class SupervisorUserStationPermissions1700000000038 {
    name = "SupervisorUserStationPermissions1700000000038";

    async up(queryRunner) {
        console.log("🔧 SupervisorUserStationPermissions: supervisor ← add/delete user_station...");

        const permNames = ["can_add_user_station", "can_delete_user_station"];
        const rows = await queryRunner.query("SELECT id FROM `roles` WHERE name = ?", ["supervisor"]);
        if (rows.length === 0) {
            console.warn("  ⚠️  supervisor role not found — skipping");
            return;
        }
        const roleId = rows[0].id;

        for (const name of permNames) {
            const permRows = await queryRunner.query("SELECT id FROM `permissions` WHERE name = ?", [name]);
            if (permRows.length === 0) {
                console.warn(`  ⚠️  permission ${name} missing — run permission seed first`);
                continue;
            }
            const permissionId = permRows[0].id;
            const existing = await queryRunner.query(
                "SELECT id FROM `role_permissions` WHERE role_id = ? AND permission_id = ?",
                [roleId, permissionId],
            );
            if (existing.length === 0) {
                await queryRunner.query(
                    "INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`, `updated_at`) VALUES (?, ?, NOW(), NULL)",
                    [roleId, permissionId],
                );
                console.log(`  ✅ Assigned ${name} → supervisor`);
            } else {
                console.log(`  ⏭️  ${name} already assigned to supervisor`);
            }
        }

        console.log("✅ SupervisorUserStationPermissions done.");
    }

    async down(queryRunner) {
        const permNames = ["can_add_user_station", "can_delete_user_station"];
        const rows = await queryRunner.query("SELECT id FROM `roles` WHERE name = ?", ["supervisor"]);
        if (rows.length === 0) return;
        const roleId = rows[0].id;

        for (const name of permNames) {
            const permRows = await queryRunner.query("SELECT id FROM `permissions` WHERE name = ?", [name]);
            if (permRows.length === 0) continue;
            await queryRunner.query("DELETE FROM `role_permissions` WHERE role_id = ? AND permission_id = ?", [
                roleId,
                permRows[0].id,
            ]);
        }
    }
};
