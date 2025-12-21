import { Column, Entity, PrimaryGeneratedColumn, Index } from "typeorm";

export enum CategoryStatus {
  ACTIVE = "active",
  DISABLED = "disabled",
  DELETED = "deleted",
}

@Entity("category")
@Index(["status"]) // Index for status filtering
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({
    type: "enum",
    enum: CategoryStatus,
    default: CategoryStatus.ACTIVE,
  })
  status: CategoryStatus;
}
