import { Entity, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { User } from "@entities/User";
import { Role } from "@entities/Role";

@Entity("user_roles")
export class UserRole {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.roles)
  user: User;

  @ManyToOne(() => Role, (role) => role.users)
  role: Role;
}
