import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { Item } from "./Item";

@Entity()
export class ItemGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Item, { eager: true })
  @JoinColumn({ name: "item_id" })
  item: Item;

  @ManyToOne(() => Item, { eager: true })
  @JoinColumn({ name: "sub_item_id" })
  subItem: Item;
}
