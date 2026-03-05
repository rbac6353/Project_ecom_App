import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Category } from './category.entity';

@Entity('subcategory')
export class Subcategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // 'emoji' | 'image' | 'ionicon'
  @Column({ default: 'emoji' })
  iconType: string;

  @Column({ nullable: true })
  iconEmoji: string;

  @Column({ type: 'text', nullable: true })
  iconImageUrl: string;

  @Column({ nullable: true })
  iconIonicon: string;

  @Column()
  categoryId: number;

  @ManyToOne(() => Category, (category) => category.subcategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  // ถ้าเป็นหมวดเฉพาะร้าน ให้ผูกกับ storeId (nullable)
  @Column({ nullable: true })
  storeId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


