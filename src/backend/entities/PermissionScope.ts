import { Entity, Column, OneToMany } from "typeorm";
import type { Permission } from "./Permission";
import { BaseEntity } from "./BaseEntity";

@Entity("permission_scope")
export class PermissionScope extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  // Resolved by table name to avoid class-reference fragility in webpack bundles.
  @OneToMany("permissions", (permission: Permission) => permission.scope)
  permissions: Permission[];
}
