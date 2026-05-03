import { Entity, ManyToOne, JoinColumn, Column, Index } from "typeorm";
import { Station } from "./Station";
import { User } from "./User";
import { BaseEntity } from "./BaseEntity";
import { enumColType } from "./column-types";

export enum UserStationStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

@Entity("user_station")
@Index(["user", "status"]) // Composite index for user + status queries
@Index(["user", "isDefault", "status"]) // Composite index for default station queries
export class UserStation extends BaseEntity {
  @Column({ type: "boolean", nullable: true, name: "is_default" })
  isDefault!: boolean;

  @Column({
    type: enumColType,
    enum: UserStationStatus,
    nullable: true,
    default: UserStationStatus.ACTIVE,
  })
  status!: UserStationStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Station)
  @JoinColumn({ name: "station_id" })
  station: Station;
}
