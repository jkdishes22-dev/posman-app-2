import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "@entities/User";
import * as process from "process";
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
    ItemGroup,
    Category,
    PermissionScope,
    Bill,
    BillItem,
    Pricelist,
    PricelistItem,
    Station,
    UserStation,
    Payment,
    BillPayment
  ],
  synchronize: false,
  logging: ["error"],
  timezone: "Africa/Nairobi",
});

AppDataSource.initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
  })
  .catch((err) => {
    console.error("Error during Data Source initialization:", err);
  });
