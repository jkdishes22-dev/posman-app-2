import { Entity, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Role } from "@entities/Role";
import { Permission } from "@entities/Permission";
import { BaseEntity } from "./BaseEntity";

@Entity("role_permissions")
export class RolePermission extends BaseEntity {
  @ManyToOne(() => Role, (role) => role.permissions)
  role: Role;

  @ManyToOne(() => Permission, (permission) => permission.roles)
  permission: Permission;
}
