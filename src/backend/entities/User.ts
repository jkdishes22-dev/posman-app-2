import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BeforeInsert,
  JoinTable,
  ManyToMany,
} from "typeorm";
import bcrypt from "bcryptjs";
import { Role } from "@entities/Role";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  username!: string;

  @Column()
  lastName!: string;

  @Column()
  firstName!: string;

  @Column()
  password!: string;

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: "user_roles",
    joinColumn: {
      name: "user_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "role_id",
      referencedColumnName: "id",
    },
  })
  roles: Role[];

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
