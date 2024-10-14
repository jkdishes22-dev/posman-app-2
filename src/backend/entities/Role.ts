import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { User } from "@entities/User";
import { Permission } from "@entities/Permission";

@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];

  @ManyToMany(() => Permission, (permission) => permission.roles)
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
