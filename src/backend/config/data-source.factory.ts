import "reflect-metadata";
import path from "path";
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
import { ProductionIssue } from "@backend/entities/ProductionIssue";
import { ProductionPreparation } from "@backend/entities/ProductionPreparation";
import { PricelistItemAudit } from "@backend/entities/PricelistItemAudit";
import { ItemAudit } from "@backend/entities/ItemAudit";
import { EntityRef } from "@entities/entity-refs";

EntityRef.set("StationPricelist", StationPricelist);
EntityRef.set("User", User);
EntityRef.set("Permission", Permission);
EntityRef.set("BillItem", BillItem);
EntityRef.set("BillPayment", BillPayment);
EntityRef.set("PurchaseOrderItem", PurchaseOrderItem);

const entities = [
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
  PurchaseOrderItem,
  PurchaseOrder,
  InventoryTransaction,
  SupplierPayment,
  SupplierTransaction,
  ProductionIssue,
  ProductionPreparation,
  PricelistItemAudit,
  ItemAudit,
];

function getSqlitePath(): string {
  // In packaged Electron, main process sets SQLITE_DB_PATH to app.getPath("userData")/posman.db
  // In dev, fall back to project root
  return process.env.SQLITE_DB_PATH || path.join(process.cwd(), "posman.db");
}

export function createAppDataSource(): DataSource {
  const mode = process.env.DB_MODE || "mysql";

  if (mode === "sqlite") {
    return new DataSource({
      type: "better-sqlite3",
      database: getSqlitePath(),
      entities,
      migrations: ["src/backend/config/migrations-sqlite/[0-9]*.cjs"],
      synchronize: false,
    });
  }

  return new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || process.env.MYSQL_HOST || "localhost",
    port: process.env.DB_PORT || process.env.MYSQL_PORT
      ? parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || "3306")
      : 3306,
    username: process.env.DB_USER || process.env.MYSQL_USERNAME || "root",
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "password",
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || "test",
    entities,
    migrations: ["src/backend/config/migrations/*.cjs"],
    synchronize: false,
    extra: {
      connectionLimit: 20,
      idleTimeout: 30000,
      maxIdle: 10,
      connectTimeout: 60000,
    },
  });
}