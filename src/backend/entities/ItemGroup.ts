import { Entity, ManyToOne, JoinColumn, Column } from "typeorm";
import { Item } from "./Item";
import { BaseEntity } from "@entities/BaseEntity";

@Entity()
export class ItemGroup extends BaseEntity {
  @Column()
  name!: string;

  @ManyToOne(() => Item, { eager: true })
  @JoinColumn({ name: "item_id" })
  item: Item;

  @ManyToOne(() => Item, { eager: true })
  @JoinColumn({ name: "sub_item_id" })
  subItem: Item;
}