import { Entity, Column, ManyToMany, JoinTable } from "typeorm";
import type { User } from "./User";
import type { Permission } from "./Permission";
import { BaseEntity } from "./BaseEntity";

@Entity("roles")
export class Role extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  @ManyToMany(() => require("./User").User, (user: any) => user.roles)
  users: User[];

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  @ManyToMany(() => require("./Permission").Permission, (permission: any) => permission.roles)
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
