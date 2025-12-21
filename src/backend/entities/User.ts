import {
  Entity,
  Column,
  BeforeInsert,
  JoinTable,
  ManyToMany,
} from "typeorm";
import bcrypt from "bcryptjs";
import { Role } from "./Role";
import { Exclude } from "class-transformer";
import { BaseEntity } from "./BaseEntity";

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

@Entity("user")
export class User extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  username!: string;

  @Column({ type: "varchar", length: 255 })
  lastName!: string;

  @Column({ type: "varchar", length: 255 })
  firstName!: string;

  @Column({ type: "varchar", length: 255 })
  @Exclude()
  password!: string;

  @Column({ type: "varchar", length: 255, enum: UserStatus, default: UserStatus.ACTIVE })
  status!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  refreshToken?: string;

  @Column({ type: "boolean", default: false })
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
