import { Entity, ManyToOne } from "typeorm";
import { Role } from "./Role";
import { Permission } from "./Permission";
import { BaseEntity } from "./BaseEntity";

@Entity("role_permissions")
export class RolePermission extends BaseEntity {
  @ManyToOne(() => Role, (role) => role.permissions)
  role: Role;

  @ManyToOne(() => Permission, (permission) => permission.roles)
  permission: Permission;
}
