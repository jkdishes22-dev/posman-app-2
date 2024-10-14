import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn
} from "typeorm";
import { Category } from "./Category";
import { ItemType } from "./ItemType";

@Entity()
export class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  code: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: "item_category_id" })
  category: Category;

  @ManyToOne(() => ItemType)
  @JoinColumn({ name: "item_type_id" })
  itemType: ItemType;

  @Column({ nullable: true, name: "default_unit_id" })
  defaultUnitId: number;
}
