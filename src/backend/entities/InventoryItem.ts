import { Entity } from "typeorm";
import { BaseEntity } from "./BaseEntity";

@Entity()
export class InventoryItem extends BaseEntity {
  @ManyToOne(() => Item)
  @JoinColumn({ name: "item_id" })
  item: Item;
}
