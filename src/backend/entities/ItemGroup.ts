import { Entity, ManyToOne, JoinColum } from "typeorm";
import { Item } from "./Item";
import { BaseEntity } from "@entities/BaseEntity";

@Entity()
export class ItemGroup extends BaseEntity {
  @ManyToOne(() => Item, { eager: true })
  @JoinColumn({ name: "item_id" })
  item: Item;

  @ManyToOne(() => Item, { eager: true })
  @JoinColumn({ name: "sub_item_id" })
  subItem: Item;
}
