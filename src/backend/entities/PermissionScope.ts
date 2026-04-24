import { Entity, Column, OneToMany } from "typeorm";
import type { Permission } from "./Permission";
import { BaseEntity } from "./BaseEntity";

@Entity("permission_scope")
export class PermissionScope extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  @OneToMany(() => require("./Permission").Permission, (permission: any) => permission.scope)
  permissions: Permission[];
}
