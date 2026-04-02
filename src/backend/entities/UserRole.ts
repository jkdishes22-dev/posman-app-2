import { Entity, ManyToOne, JoinColumn, Index } from "typeorm";
import { User } from "./User";
import { Role } from "./Role";
import { BaseEntity } from "./BaseEntity";

@Entity("user_roles")
export class UserRole extends BaseEntity {
  // perf: index FK — queried in auth middleware on every authenticated request (cache miss)
  @Index()
  @ManyToOne(() => User, (user) => user.roles)
  @JoinColumn({ name: "user_id" })
  user: User;

  // perf: index FK — joined when resolving role permissions
  @Index()
  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: "role_id" })
  role: Role;
}
