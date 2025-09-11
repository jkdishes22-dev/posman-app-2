import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Station } from "./Station";

export enum PriceListStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

@Entity("pricelist")
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

  @ManyToOne(() => Station)
  @JoinColumn({ name: "station_id" })
  station: Station;

  @Column({ type: "boolean", default: false })
  is_default: boolean;

  // @OneToMany(() => PricelistItem, (pricelistItem) => pricelistItem.pricelist)
  // pricelistItems: PricelistItem[];
}
