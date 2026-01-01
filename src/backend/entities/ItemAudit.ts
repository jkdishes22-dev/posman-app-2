import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { Item } from "./Item";
import { User } from "./User";

@Entity("item_audit")
@Index(["item_id"])
@Index(["changed_at"])
@Index(["changed_by"])
export class ItemAudit {
  @Column({ type: "int", unsigned: true, primary: true, generated: true })
  id: number;

  @ManyToOne(() => Item)
  @JoinColumn({ name: "item_id" })
  item: Item;

  @Column({ type: "int", unsigned: true })
  item_id: number;

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

