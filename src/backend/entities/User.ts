import {
  Entity,
  Column,
  BeforeInsert,
  JoinTable,
  ManyToMany,
} from "typeorm";
import bcrypt from "bcryptjs";
import { Role } from "@entities/Role";
import { Exclude } from "class-transformer";
import { BaseEntity } from "./BaseEntity";

@Entity("user")
export class User extends BaseEntity {
  @Column()
  username!: string;

  @Column()
  lastName!: string;

  @Column()
  firstName!: string;

  @Column()
  @Exclude()
  password!: string;

  @Column({ default: "ACTIVE" })
  status!: string;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ default: false })
  is_locked!: boolean;

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
