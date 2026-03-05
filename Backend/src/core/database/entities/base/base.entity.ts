import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ name: 'createdAt', type: 'datetime', precision: 6 }) // ใช้ camelCase เพื่อให้ตรงกับ Database
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'datetime', precision: 6 }) // ใช้ camelCase เพื่อให้ตรงกับ Database
  updatedAt: Date;
}

