import { Column, Entity } from "typeorm";
import { BaseEntity } from "@entities/BaseEntity";
import { BillStatus } from "@entities/Bill";

export enum PriceListStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

@Entity()
export class Pricelist extends BaseEntity {
  @Column()
  name: string;

  @Column({
    type: "enum",
    enum: PriceListStatus,
    nullable: true,
    default: PriceListStatus.ACTIVE,
  })
  status: PriceListStatus;

  // @OneToMany(() => PricelistItem, (pricelistItem) => pricelistItem.pricelist)
  // pricelistItems: PricelistItem[];
}
