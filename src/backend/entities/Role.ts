import { Entity, Column, ManyToMany, JoinTable } from "typeorm";
import type { User } from "./User";
import type { Permission } from "./Permission";
import { BaseEntity } from "./BaseEntity";
import { EntityRef } from "./entity-refs";

@Entity("roles")
export class Role extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  @ManyToMany(() => EntityRef.get("User"), (user: any) => user.roles)
  users: User[];

  @ManyToMany(() => EntityRef.get("Permission"), (permission: any) => permission.roles)
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
