import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ type: 'datetime',  default: () => "CURRENT_TIMESTAMP" })
  readonly created_at!: Date;

  @UpdateDateColumn({ type: 'datetime',  nullable: true  })
  readonly updated_at!: Date;

  @Column({ nullable: true })
  created_by: number;

  @Column({ nullable: true })
  updated_by: number;
}
