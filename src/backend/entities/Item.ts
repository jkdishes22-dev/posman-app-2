import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { Category } from "@entities/Category";
import { PricelistItem } from "@entities/PricelistItem";
import { BillItem } from "@entities/BillItem";

@Entity()
export class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column()
  price: number;

  @ManyToOne(() => Category)
  @JoinColumn({ name: "item_category_id" })
  category: Category;

  @Column({ nullable: true, name: "default_unit_id" })
  defaultUnitId: number;

  @Column({ nullable: true, name: "is_group" })
  isGroup: boolean;

  @ManyToMany(() => Item)
  @JoinTable({
    name: "item_group",
    joinColumn: {
      name: "item_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "sub_item_id",
      referencedColumnName: "id",
    },
  })
  subItems: Item[];

  // @OneToMany(() => BillItem, (billItem) => billItem.item)
  // bill_items: BillItem[];

  // @OneToMany(() => PricelistItem, (pricelistItem) => pricelistItem.pricelist)
  // pricelistItems: PricelistItem[];
}
