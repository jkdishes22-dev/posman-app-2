import "reflect-metadata";
import { DataSource } from "typeorm";
import * as process from "process";

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
  synchronize: false,
  // logging: true,
  timezone: "Africa/Nairobi",
  poolSize: 20,
  connectTimeout: 20000,
});

export const getConnection = async () => {
  if (!connectionInstance) {
    connectionInstance = await AppDataSource.initialize();
  }
  return connectionInstance;
};
