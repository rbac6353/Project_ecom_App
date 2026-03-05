import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';
import { StoreFollower } from './store-follower.entity';
import { Subcategory } from '../category/subcategory.entity';

@Entity('store')
export class Store {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  followerCount: number;

  @Column({ default: true })
  isActive: boolean; // ✅ ปิด-เปิดร้านค้า (true = เปิด, false = ปิด)

  // ✅ สถานะร้านค้าทางการ (Mall)
  @Column({ default: false })
  isMall: boolean;

  @Column()
  ownerId: number;

  @ManyToOne(() => User, (user) => user.stores)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => Product, (product) => product.store)
  products: Product[];
}

