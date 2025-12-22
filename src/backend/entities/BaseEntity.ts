import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  readonly created_at!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true })
  readonly updated_at!: Date;

  @Column({ type: "int", nullable: true })
  created_by: number;

  @Column({ type: "int", nullable: true })
  updated_by: number;
}
