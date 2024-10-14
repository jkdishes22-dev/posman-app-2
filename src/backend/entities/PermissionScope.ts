import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Permission } from "@entities/Permission";

@Entity("permission_scope")
export class PermissionScope {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Permission, (permission) => permission.scope)
  permissions: Permission[];
}
