import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  Index,
} from "typeorm";
import { Category } from "./Category";
import { BaseEntity } from "./BaseEntity";

export enum ItemStatus {
  ACTIVE = "ACTIVE",
  DELETED = "DELETED",
}

@Entity("item")
export class Item extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 255 })
  code: string;

  // perf: index status — filtered in nearly every item list query
  @Index()
  @Column({
    type: "enum",
    enum: ItemStatus,
  })
  status: string;

  // perf: index FK — queried in fetchItems and category-filtered searches
  @Index()
  @ManyToOne(() => Category)
  @JoinColumn({ name: "item_category_id" })
  category: Category;

  @Column({ type: "int", nullable: true, name: "default_unit_id" })
  defaultUnitId: number;

  // perf: index is_group — filtered in fetchGroupedItems queries
  @Index()
  @Column({ type: "boolean", nullable: true, name: "is_group" })
  isGroup: boolean;

  // perf: index is_stock — filtered in inventory/production queries
  @Index()
  @Column({ type: "boolean", nullable: true, name: "is_stock", default: false })
  isStock: boolean;

  @Column({ type: "boolean", nullable: true, name: "allow_negative_inventory", default: false })
  allowNegativeInventory?: boolean;

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
