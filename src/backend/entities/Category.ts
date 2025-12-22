import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";

export enum CategoryStatus {
  ACTIVE = "active",
  DISABLED = "disabled",
  DELETED = "deleted",
}

@Entity("category")
@Index(["status"]) // Index for status filtering
export class Category extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({
    type: "enum",
    enum: CategoryStatus,
    default: CategoryStatus.ACTIVE,
  })
  status: CategoryStatus;
}
