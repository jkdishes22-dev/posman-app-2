import { Entity, ManyToOne, JoinColumn, Column } from "typeorm";
import { Item } from "./Item";
import { BaseEntity } from "./BaseEntity";

@Entity("item_group")
export class ItemGroup extends BaseEntity {
  @Column({ type: "double", precision: 10, scale: 2 })
  portion_size!: number;

  @ManyToOne(() => Item, { eager: true })
  @JoinColumn({ name: "item_id" })
  item: Item;

  @ManyToOne(() => Item, { eager: true })
  @JoinColumn({ name: "sub_item_id" })
  subItem: Item;
}
