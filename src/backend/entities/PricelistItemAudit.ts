import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { PricelistItem } from "./PricelistItem";
import { User } from "./User";

@Entity("pricelist_item_audit")
@Index(["pricelist_item_id"])
@Index(["changed_at"])
@Index(["changed_by"])
export class PricelistItemAudit {
  @Column({ type: "int", unsigned: true, primary: true, generated: true })
  id: number;

  @ManyToOne(() => PricelistItem)
  @JoinColumn({ name: "pricelist_item_id" })
  pricelist_item: PricelistItem;

  @Column({ type: "int", unsigned: true })
  pricelist_item_id: number;

  @Column({ type: "varchar", length: 255 })
  field_name: string;

  @Column({ type: "text", nullable: true })
  old_value: string | null;

  @Column({ type: "text", nullable: true })
  new_value: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "changed_by" })
  changed_by_user: User | null;

  @Column({ type: "int", unsigned: true, nullable: true })
  changed_by: number | null;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  changed_at: Date;

  @Column({ type: "text", nullable: true })
  change_reason: string | null;
}

