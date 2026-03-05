import {
  Entity,
  Column,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../product/product.entity';
import { Subcategory } from './subcategory.entity';

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  /** SEO-friendly URL (auto-generated from name if not provided) */
  @Column({ unique: true, nullable: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  image: string;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  // ความสัมพันธ์กับ Subcategory (หมวดย่อย)
  @OneToMany(() => Subcategory, (subcategory) => subcategory.category)
  subcategories: Subcategory[];
}

