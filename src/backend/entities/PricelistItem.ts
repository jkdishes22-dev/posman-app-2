import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { Pricelist } from "./Pricelist";
import { Item } from "./Item";
import { BaseEntity } from "./BaseEntity";

export enum Currency {
  USD = "USD",
  KES = "KES",
}
@Entity("pricelist_item")
export class PricelistItem extends BaseEntity {
  // perf: index FK — heavily queried in searchItemsByName and fetchPricelistItems
  @Index()
  @ManyToOne(() => Pricelist)
  @JoinColumn({ name: "pricelist_id" })
  pricelist: Pricelist;

  // perf: index FK — queried in item search and pricelist fetch joins
  @Index()
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

  @Column({ type: "tinyint", width: 1, default: true })
  is_enabled: boolean;
}
