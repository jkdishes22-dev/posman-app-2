import { Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Item } from "./Item";

@Entity("inventory_item")
export class InventoryItem extends BaseEntity {
  @ManyToOne(() => Item)
  @JoinColumn({ name: "item_id" })
  item: Item;
}
