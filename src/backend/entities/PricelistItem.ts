import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Pricelist } from "./Pricelist";
import { Item } from "./Item";

@Entity()
export class PricelistItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Pricelist)
  @JoinColumn({ name: "pricelist_id" })
  pricelist: Pricelist;

  @ManyToOne(() => Item)
  @JoinColumn({ name: "item_id" })
  item: Item;

  @Column()
  name: string;

  @Column({ type: "double", default: 0.0 })
  price: number;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @Column({ type: "datetime", nullable: true })
  updated_at: Date;

  @Column({ nullable: true })
  created_by: number;

  @Column({ nullable: true })
  updated_by: number;
}
