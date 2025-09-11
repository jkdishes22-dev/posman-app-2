import { Entity, Column, ManyToMany, ManyToOne, JoinColumn } from "typeorm";
import { Role } from "./Role";
import { PermissionScope } from "./PermissionScope";
import { BaseEntity } from "./BaseEntity";

@Entity("permissions")
export class Permission extends BaseEntity {
  @Column()
  name: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  @ManyToOne(() => PermissionScope, (scope) => scope.permissions)
  @JoinColumn({ name: "scope_id" })
  scope: PermissionScope;
}
