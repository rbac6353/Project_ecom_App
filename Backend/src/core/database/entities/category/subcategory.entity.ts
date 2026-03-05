import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../base/base.entity';
import { Category } from './category.entity';
import { Store } from '../store/store.entity';
import { Product } from '../product/product.entity';

@Entity('subcategory')
export class Subcategory extends BaseEntity {
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

  // ✅ Relation กลับมาหา Product
  @OneToMany(() => Product, (product) => product.subcategory)
  products: Product[];

  // ถ้าเป็นหมวดเฉพาะร้าน ให้ผูกกับ storeId (nullable)
  @Column({ nullable: true })
  storeId: number | null;
}

