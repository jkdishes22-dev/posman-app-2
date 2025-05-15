import { Entity, ManyToOne, JoinColumn, Column } from "typeorm";
import { Station } from "./Station";
import { User } from "./User";
import { BaseEntity } from "./BaseEntity";

export enum UserStationStatus {
  ENABLED = "enabled",
  DISABLED = "disabled",
}

@Entity("user_station")
export class UserStation extends BaseEntity {
  @Column({ nullable: true, name: "is_default" })
  isDefault!: boolean;

  @Column({
    type: "enum",
    enum: UserStationStatus,
    nullable: true,
    default: UserStationStatus.ENABLED,
  })
  status!: UserStationStatus;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Station, { eager: true })
  @JoinColumn({ name: "station_id" })
  station: Station;
}
