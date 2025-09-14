const { DataSource } = require('typeorm');

async function runMigration() {
    const dataSource = new DataSource({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'password',
        database: 'posman_app', // Try this database name
        entities: [],
        synchronize: false,
        logging: true
    });

    try {
        await dataSource.initialize();
        console.log('Connected to database');

        // Check if database exists
        const databases = await dataSource.query('SHOW DATABASES');
        console.log('Available databases:', databases.map(db => db.Database));

        // Try to find the correct database
        const posmanDb = databases.find(db => db.Database.includes('posman'));
        if (posmanDb) {
            console.log('Found database:', posmanDb.Database);

            // Switch to the correct database
            await dataSource.query(`USE ${posmanDb.Database}`);

            // Update user_station status values
            const result1 = await dataSource.query("UPDATE user_station SET status = 'active' WHERE status = 'enabled'");
            console.log('Updated enabled to active:', result1.affectedRows, 'rows');

            const result2 = await dataSource.query("UPDATE user_station SET status = 'inactive' WHERE status = 'disabled'");
            console.log('Updated disabled to inactive:', result2.affectedRows, 'rows');

            const result3 = await dataSource.query("UPDATE user_station SET status = 'inactive' WHERE status IS NULL");
            console.log('Updated NULL to inactive:', result3.affectedRows, 'rows');

            console.log('Migration completed successfully');
        } else {
            console.log('No posman database found');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await dataSource.destroy();
    }
}

runMigration();
