const mysql = require('mysql2/promise');

async function checkMigrations() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: 'bizmaster'
    });

    try {
        console.log('🔍 Checking database schema...\n');

        // Check bill table
        const [billColumns] = await connection.execute('DESCRIBE bill');
        const hasStationId = billColumns.some(col => col.Field === 'station_id');
        console.log(`✅ Bill table station_id column: ${hasStationId ? 'EXISTS' : 'MISSING'}`);

        // Check pricelist table
        const [pricelistColumns] = await connection.execute('DESCRIBE pricelist');
        const hasIsDefault = pricelistColumns.some(col => col.Field === 'is_default');
        console.log(`✅ Pricelist table is_default column: ${hasIsDefault ? 'EXISTS' : 'MISSING'}`);

        // Check indexes
        const [billIndexes] = await connection.execute('SHOW INDEX FROM bill WHERE Key_name = "idx_bill_station"');
        const [pricelistIndexes] = await connection.execute('SHOW INDEX FROM pricelist WHERE Key_name = "idx_pricelist_is_default"');

        console.log(`✅ Bill station index: ${billIndexes.length > 0 ? 'EXISTS' : 'MISSING'}`);
        console.log(`✅ Pricelist is_default index: ${pricelistIndexes.length > 0 ? 'EXISTS' : 'MISSING'}`);

        console.log('\n🎉 Migration status check complete!');

        if (hasStationId && hasIsDefault) {
            console.log('✅ All required migrations are applied!');
        } else {
            console.log('❌ Some migrations are missing. Please run the manual SQL migration.');
        }

    } catch (error) {
        console.error('❌ Error checking migrations:', error.message);
    } finally {
        await connection.end();
    }
}

checkMigrations();
