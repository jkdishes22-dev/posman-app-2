module.exports = {
    up: async (db) => {
        await db.run(`INSERT OR IGNORE INTO "system_settings" ("key", "value") VALUES ('bill_settings', '{"show_tax_on_receipt":true}')`);
        await db.run(`INSERT OR IGNORE INTO "system_settings" ("key", "value") VALUES ('admin_settings', '{"db_backup_frequency":"daily"}')`);
    },
    down: async (db) => {
        await db.run(`DELETE FROM "system_settings" WHERE "key" IN ('bill_settings', 'admin_settings')`);
    },
};
