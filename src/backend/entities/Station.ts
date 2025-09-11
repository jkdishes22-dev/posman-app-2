import { Column, Entity } from "typeorm";
import { BaseEntity } from "./BaseEntity";

export enum StationStatus {
  ENABLED = "enabled",
  DISABLED = "disabled",
}

@Entity("station")
export class Station extends BaseEntity {
  @Column({ nullable: false })
  name: string;

  @Column({
    type: "enum",
    enum: StationStatus,
    default: StationStatus.ENABLED,
  })
  status: StationStatus;
}
