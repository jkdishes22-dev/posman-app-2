import { Entity, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { Role } from "./Role";
import { BaseEntity } from "./BaseEntity";

@Entity("user_roles")
export class UserRole extends BaseEntity {
  @ManyToOne(() => User, (user) => user.roles)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: "role_id" })
  role: Role;
}
