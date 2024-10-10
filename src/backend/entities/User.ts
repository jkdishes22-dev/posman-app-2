import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  username!: string;

  @Column()
  lastName!: string;

  @Column()
  firstName!: string;

  @Column()
  password!: string;
}
