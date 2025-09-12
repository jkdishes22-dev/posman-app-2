import "reflect-metadata";
import { DataSource } from "typeorm";
import * as process from "process";
import { getAppTimezone } from "./timezone";

import { User } from "@entities/User";
import { Role } from "@entities/Role";
import { Permission } from "@entities/Permission";
import { UserRole } from "@entities/UserRole";
import { RolePermission } from "@entities/RolePermission";
import { Category } from "@entities/Category";
import { Item } from "@entities/Item";
import { PermissionScope } from "@entities/PermissionScope";
import { ItemGroup } from "@entities/ItemGroup";
import { BillItem } from "@entities/BillItem";
import { Bill } from "@entities/Bill";
import { Pricelist } from "@entities/Pricelist";
import { PricelistItem } from "@entities/PricelistItem";
import { Station } from "@backend/entities/Station";
import { UserStation } from "@backend/entities/UserStation";
import { BillPayment } from "@backend/entities/BillPayment";
import { Payment } from "@backend/entities/Payment";

let connectionInstance: DataSource | null = null;
let isInitializing = false;

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "test",
  entities: [
    User,
    Role,
    Permission,
    UserRole,
    RolePermission,
    Item,
    Payment,
    Pricelist,
    ItemGroup,
    Category,
    PermissionScope,
    Bill,
    BillItem,
    BillPayment,
    PricelistItem,
    Station,
    UserStation,
  ],
  // migrations: ["src/backend/config/migrations/*.cjs"],
  synchronize: false,
  // logging: true,
  // timezone: getAppTimezone(),
  poolSize: 5,
  connectTimeout: 10000,
  acquireTimeout: 10000,
  extra: {
    connectionLimit: 5,
    acquireTimeout: 10000,
    timeout: 10000,
  },
});

export const getConnection = async (): Promise<DataSource> => {
  if (connectionInstance && connectionInstance.isInitialized) {
    return connectionInstance;
  }

  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return connectionInstance!;
  }

  isInitializing = true;
  try {
    if (!connectionInstance) {
      console.log("Initializing database connection...");
      connectionInstance = await AppDataSource.initialize();
      console.log("Database connection initialized successfully");
    }
    return connectionInstance;
  } catch (error) {
    console.error("Failed to initialize database connection:", error);
    // Reset connection instance on error
    connectionInstance = null;
    throw error;
  } finally {
    isInitializing = false;
  }
};

export const closeConnection = async (): Promise<void> => {
  if (connectionInstance && connectionInstance.isInitialized) {
    await connectionInstance.destroy();
    connectionInstance = null;
    console.log("Database connection closed");
  }
};

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connection...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connection...');
  await closeConnection();
  process.exit(0);
});
