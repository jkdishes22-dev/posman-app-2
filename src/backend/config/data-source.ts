import "reflect-metadata";
import { DataSource } from "typeorm";

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
import { StationPricelist } from "@backend/entities/StationPricelist";
import { UserStation } from "@backend/entities/UserStation";
import { BillPayment } from "@backend/entities/BillPayment";
import { Payment } from "@backend/entities/Payment";
import { Notification } from "@backend/entities/Notification";
import { CreditNote } from "@backend/entities/CreditNote";
import { ReopenReason } from "@backend/entities/ReopenReason";
import { Supplier } from "@backend/entities/Supplier";
import { Inventory } from "@backend/entities/Inventory";
import { PurchaseOrderItem } from "@backend/entities/PurchaseOrderItem";
import { PurchaseOrder } from "@backend/entities/PurchaseOrder";
import { InventoryTransaction } from "@backend/entities/InventoryTransaction";
import { SupplierPayment } from "@backend/entities/SupplierPayment";
import { SupplierTransaction } from "@backend/entities/SupplierTransaction";

let connectionInstance: DataSource | null = null;
let isInitializing = false;

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || process.env.MYSQL_HOST || "localhost",
  port: process.env.DB_PORT || process.env.MYSQL_PORT
    ? parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || "3306")
    : 3306,
  username: process.env.DB_USER || process.env.MYSQL_USERNAME || "root",
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "password",
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || "test",
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
    StationPricelist,
    UserStation,
    Notification,
    CreditNote,
    ReopenReason,
    Supplier,
    Inventory,
    PurchaseOrder,
    PurchaseOrderItem,
    InventoryTransaction,
    SupplierPayment,
    SupplierTransaction,
  ],
  migrations: ["src/backend/config/migrations/*.cjs"],
  synchronize: false,
  // logging: true,
  // timezone: getAppTimezone(),
  extra: {
    connectionLimit: 20,
    idleTimeout: 30000,
    maxIdle: 10,
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
      connectionInstance = await AppDataSource.initialize();
    }
    return connectionInstance;
  } catch (error) {
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

// Graceful shutdown handler - only set up if process.on exists (Node.js environment)
if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("SIGINT", async () => {
    await closeConnection();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await closeConnection();
    process.exit(0);
  });
}
