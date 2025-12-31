// CommonJS version of data-source.ts for TypeORM CLI
// This file is used by TypeORM CLI to run migrations

require("dotenv").config();
require("reflect-metadata");

const { DataSource } = require("typeorm");
const path = require("path");

// Import entities - using require for CommonJS compatibility
// Note: In production, you might need to compile TypeScript first
// or use a different approach to load entities

const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || "3306"),
    username: process.env.DB_USER || process.env.MYSQL_USERNAME || "root",
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "password",
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || "test",
    // For CLI, we only need migrations, not entities
    migrations: [path.join(__dirname, "migrations", "*.cjs")],
    migrationsTableName: "migrations",
    synchronize: false,
    extra: {
        connectionLimit: 20,
        idleTimeout: 30000,
        maxIdle: 10,
        // Only connectTimeout is valid for MySQL2
        connectTimeout: 60000, // 60 seconds
    },
});

module.exports = AppDataSource;

