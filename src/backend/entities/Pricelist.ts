import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "@entities/BaseEntity";
import { Station } from "./Station";

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

  @ManyToOne(() => Station)
  @JoinColumn({ name: "station_id" })
  station: Station;

  // @OneToMany(() => PricelistItem, (pricelistItem) => pricelistItem.pricelist)
  // pricelistItems: PricelistItem[];
}
