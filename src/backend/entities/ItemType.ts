import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class ItemType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}
