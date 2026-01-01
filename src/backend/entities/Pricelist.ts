import { Column, Entity, OneToMany, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { StationPricelist } from "./StationPricelist";

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
    type: "enum",
    enum: PriceListStatus,
    nullable: true,
    default: PriceListStatus.INACTIVE,
  })
  status: PriceListStatus;

  @Column({ type: "boolean", default: false })
  is_default: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  description: string;

  // Relationship to stations through junction table
  @OneToMany("StationPricelist", "pricelist")
  stationPricelists: StationPricelist[];

  // @OneToMany(() => PricelistItem, (pricelistItem) => pricelistItem.pricelist)
  // pricelistItems: PricelistItem[];
}
