const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Running database migrations...');

try {
    // Run the migrations using TypeORM CLI
    const command = 'npx typeorm-ts-node-commonjs migration:run -d src/backend/config/data-source.ts';
    console.log(`Executing: ${command}`);

    execSync(command, {
        stdio: 'inherit',
        cwd: process.cwd()
    });

    console.log('✅ Migrations completed successfully!');
} catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
}
