import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import type { StationPricelist } from "./StationPricelist";
import { enumColType } from "./column-types";

export enum StationStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

@Entity("station")
export class Station extends BaseEntity {
  @Column({ type: "varchar", length: 255, nullable: false })
  name: string;

  @Column({
    type: enumColType,
    enum: StationStatus,
    default: StationStatus.INACTIVE,
  })
  status: StationStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  description: string;

  // Relationship to pricelists through junction table.
  // Resolved by table name to avoid class-reference fragility in webpack bundles.
  @OneToMany("station_pricelist", (sp: StationPricelist) => sp.station)
  stationPricelists: StationPricelist[];
}
