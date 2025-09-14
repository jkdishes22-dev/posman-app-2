import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "./BaseEntity";

export enum PriceListStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  UNDER_REVIEW = "under_review",
}

@Entity("pricelist")
export class Pricelist extends BaseEntity {
  @Column()
  name: string;

  @Column({
    type: "enum",
    enum: PriceListStatus,
    nullable: true,
    default: PriceListStatus.INACTIVE,
  })
  status: PriceListStatus;

  @Column({ type: "boolean", default: false })
  is_default: boolean;

  @Column({ type: "text", nullable: true })
  description: string;

  // Relationship to stations through junction table
  @OneToMany("StationPricelist", "pricelist")
  stationPricelists: any[];

  // @OneToMany(() => PricelistItem, (pricelistItem) => pricelistItem.pricelist)
  // pricelistItems: PricelistItem[];
}
