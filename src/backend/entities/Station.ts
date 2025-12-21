import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "./BaseEntity";

export enum StationStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

@Entity("station")
export class Station extends BaseEntity {
  @Column({ type: "varchar", length: 255, nullable: false })
  name: string;

  @Column({
    type: "enum",
    enum: StationStatus,
    default: StationStatus.INACTIVE,
  })
  status: StationStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  description: string;

  // Relationship to pricelists through junction table
  @OneToMany("StationPricelist", "station")
  stationPricelists: any[];
}
