import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { Pricelist } from "./Pricelist";
import { Item } from "./Item";
import { BaseEntity } from "@entities/BaseEntity";

export enum Currency {
  USD = "USD",
  KES = "KES",
}
@Entity()
export class PricelistItem extends BaseEntity {
  @ManyToOne(() => Pricelist)
  @JoinColumn({ name: "pricelist_id" })
  pricelist: Pricelist;

  @ManyToOne(() => Item)
  @JoinColumn({ name: "item_id" })
  item: Item;

  @Column({ type: "double", default: 0.0 })
  price: number;

  @Column({
    type: "enum",
    enum: Currency,
    nullable: true,
  })
  currency: string;
}
