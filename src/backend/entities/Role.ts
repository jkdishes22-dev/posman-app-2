import { Entity, Column, ManyToMany, JoinTable } from "typeorm";
import type { User } from "./User";
import type { Permission } from "./Permission";
import { BaseEntity } from "./BaseEntity";

@Entity("roles")
export class Role extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  // Resolved by table name to avoid class-reference fragility in webpack bundles.
  @ManyToMany("user", (user: User) => user.roles)
  users: User[];

  @ManyToMany("permissions", (permission: Permission) => permission.roles)
  @JoinTable({
    name: "role_permissions",
    joinColumn: {
      name: "role_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "permission_id",
      referencedColumnName: "id",
    },
  })
  permissions: Permission[];
}
