/* eslint-disable @typescript-eslint/no-require-imports */
// TypeORM CLI configuration file for migrations
// This file is used by TypeORM CLI to run migrations in production
// Note: For full functionality, use data-source.ts instead

require("dotenv").config();
const path = require("path");

const isSqlite = process.env.DB_MODE === "sqlite";

module.exports = isSqlite
  ? {
      type: "better-sqlite3",
      database: process.env.SQLITE_DB_PATH || path.join(process.cwd(), "posman.db"),
      migrations: [path.join(__dirname, "migrations-sqlite", "*.cjs")],
      migrationsTableName: "migrations",
      cli: {
        migrationsDir: path.join(__dirname, "migrations-sqlite"),
      },
    }
  : {
      type: "mysql",
      host: process.env.DB_HOST || process.env.MYSQL_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || "3306"),
      username: process.env.DB_USER || process.env.MYSQL_USERNAME || "root",
      password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "password",
      database: process.env.DB_NAME || process.env.MYSQL_DATABASE || "test",
      migrations: [path.join(__dirname, "migrations", "*.cjs")],
      migrationsTableName: "migrations",
      cli: {
        migrationsDir: path.join(__dirname, "migrations"),
      },
      extra: {
        connectionLimit: 20,
        idleTimeout: 30000,
        maxIdle: 10,
        connectTimeout: 60000,
      },
    };
