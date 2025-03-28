import { Entity, Column, OneToMany } from "typeorm";
import { Permission } from "@entities/Permission";
import { BaseEntity } from "./BaseEntity";

@Entity("permission_scope")
export class PermissionScope extends BaseEntity {
  @Column()
  name: string;

  @OneToMany(() => Permission, (permission) => permission.scope)
  permissions: Permission[];
}
