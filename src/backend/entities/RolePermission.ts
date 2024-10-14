import { Entity, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Role } from "@entities/Role";
import { Permission } from "@entities/Permission";

@Entity("role_permissions")
export class RolePermission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Role, (role) => role.permissions)
  role: Role;

  @ManyToOne(() => Permission, (permission) => permission.roles)
  permission: Permission;
}
