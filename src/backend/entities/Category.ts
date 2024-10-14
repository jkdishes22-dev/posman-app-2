import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum CategoryStatus {
  ACTIVE = "active",
  DISABLED = "disabled",
  DELETED = "deleted",
}

@Entity()
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    type: "enum",
    enum: CategoryStatus,
    default: CategoryStatus.ACTIVE,
  })
  status: CategoryStatus;
}
