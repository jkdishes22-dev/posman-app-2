import { Column, Entity } from "typeorm";
import { BaseEntity } from "@entities/BaseEntity";

export enum StationStatus {
  ENABLED = "enabled",
  DISABLED = "disabled",
}

@Entity()
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
