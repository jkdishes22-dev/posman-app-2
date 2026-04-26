import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

// Abstract base — no @Entity() here. TypeORM inherits these column decorators
// into each concrete child entity. Adding @Entity() on an abstract base causes
// TypeORM to register a phantom entity whose class name is minified to a single
// letter in production webpack bundles, triggering "Cyclic dependency: s" in
// SubjectTopologicalSorter when those phantom metadata objects appear in a save.
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
