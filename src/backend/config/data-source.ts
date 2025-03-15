// data-source.ts
import "reflect-metadata";
import { DataSource } from "typeorm";
import * as process from "process";
import { Container } from "typedi";

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

// Create the DataSource instance
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
  logging: true,
  timezone: "Africa/Nairobi",
  extra: {
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
  },
  poolSize: 10,
  connectTimeout: 20000,
});

// Initialize function
export const initializeDataSource = async (): Promise<DataSource> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      Container.set('DATA_SOURCE', AppDataSource);
      console.log("Data Source has been initialized!");
    }
    return AppDataSource;
  } catch (error) {
    console.error("Error during Data Source initialization", error);
    throw new Error('Failed to initialize the data source');
  }
};

// Export default instance
export default AppDataSource;
