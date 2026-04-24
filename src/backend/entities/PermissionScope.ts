import { Entity, Column, OneToMany } from "typeorm";
import type { Permission } from "./Permission";
import { BaseEntity } from "./BaseEntity";
import { EntityRef } from "./entity-refs";

@Entity("permission_scope")
export class PermissionScope extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  @OneToMany(() => EntityRef.get("Permission"), (permission: any) => permission.scope)
  permissions: Permission[];
}
