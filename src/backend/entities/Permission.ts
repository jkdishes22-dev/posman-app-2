import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Role } from "@entities/Role";
import { PermissionScope } from "@entities/PermissionScope";

@Entity("permissions")
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  @ManyToOne(() => PermissionScope, (scope) => scope.permissions)
  @JoinColumn({ name: "scope_id" })
  scope: PermissionScope;
}
