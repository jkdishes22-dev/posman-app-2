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
import { ItemType } from "@entities/ItemType";
import { PermissionScope } from "@entities/PermissionScope";
import { ItemGroup } from "@entities/ItemGroup";

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
    Item, ItemGroup, Category, ItemType,
    PermissionScope,
  ],
  synchronize: false,
  logging: ["error"],
});

AppDataSource.initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
  })
  .catch((err) => {
    console.error("Error during Data Source initialization:", err);
  });
