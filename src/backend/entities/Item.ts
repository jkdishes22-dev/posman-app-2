import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
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

  @Column({
    type: "enum",
    enum: ItemStatus,
  })
  status: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: "item_category_id" })
  category: Category;

  @Column({ type: "int", nullable: true, name: "default_unit_id" })
  defaultUnitId: number;

  @Column({ type: "boolean", nullable: true, name: "is_group" })
  isGroup: boolean;

  @Column({ type: "boolean", nullable: true, name: "is_stock", default: false })
  isStock: boolean;

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
