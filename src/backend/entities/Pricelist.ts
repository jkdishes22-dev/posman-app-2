import { Column, Entity, OneToMany, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import type { StationPricelist } from "./StationPricelist";
import { enumColType } from "./column-types";

export enum PriceListStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  UNDER_REVIEW = "under_review",
}

@Entity("pricelist")
@Index(["code"], { unique: true, where: "code IS NOT NULL" })
export class Pricelist extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 255, nullable: true, unique: true })
  code: string;

  @Column({
    type: enumColType,
    enum: PriceListStatus,
    nullable: true,
    default: PriceListStatus.INACTIVE,
  })
  status: PriceListStatus;

  @Column({ type: "boolean", default: false })
  is_default: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  description: string;

  // Relationship to stations through junction table.
  // Resolved by table name to avoid class-reference fragility in webpack bundles
  // (minified class names break TypeORM's `m.target === relation.type` lookup,
  // surfacing as: "Entity metadata for <minified>#stationPricelists was not found").
  @OneToMany("station_pricelist", (sp: StationPricelist) => sp.pricelist)
  stationPricelists: StationPricelist[];

  // @OneToMany(() => PricelistItem, (pricelistItem) => pricelistItem.pricelist)
  // pricelistItems: PricelistItem[];
}
