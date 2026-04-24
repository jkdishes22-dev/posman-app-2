import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { enumColType } from "./column-types";

export enum CategoryStatus {
  ACTIVE = "active",
  DISABLED = "disabled",
  DELETED = "deleted",
}

@Entity("category")
@Index(["status"]) // Index for status filtering
@Index(["code"], { unique: true, where: "code IS NOT NULL" })
export class Category extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 255, nullable: true, unique: true })
  code: string;

  @Column({
    type: enumColType,
    enum: CategoryStatus,
    default: CategoryStatus.ACTIVE,
  })
  status: CategoryStatus;
}
