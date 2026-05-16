/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * SQLite: seed unit_of_measurement key in system_settings.
 * Categories: mass, volume, count, length.
 */
module.exports = class UnitOfMeasurementSettingsSqlite1700000000043 {
    name = "UnitOfMeasurementSettingsSqlite1700000000043";

    async up(queryRunner) {
        console.log("🔧 UnitOfMeasurementSettings (SQLite): seeding unit_of_measurement...");

        const existing = await queryRunner.query(
            "SELECT value FROM \"system_settings\" WHERE key = 'unit_of_measurement'"
        );

        if (existing.length === 0) {
            const defaultUom = {
                mass: ["kg", "mg", "grams"],
                volume: ["liters", "ml", "cups"],
                count: ["pieces", "dozens", "pairs", "carton", "bottles", "sachets", "cans", "rolls", "trays"],
                length: [],
            };
            await queryRunner.query(
                "INSERT INTO \"system_settings\" (\"key\", \"value\") VALUES ('unit_of_measurement', ?)",
                [JSON.stringify(defaultUom)]
            );
            console.log("  ✅ unit_of_measurement setting seeded");
        } else {
            console.log("  ⏭️  unit_of_measurement already exists");
        }

        console.log("✅ UnitOfMeasurementSettings (SQLite) done.");
    }

    async down(queryRunner) {
        await queryRunner.query("DELETE FROM \"system_settings\" WHERE key = 'unit_of_measurement'");
    }
};