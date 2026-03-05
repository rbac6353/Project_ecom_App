import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from './product.entity';
import { Store } from './store.entity';

@Entity('review')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'text', nullable: true })
  images: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.reviews)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  productId: number;

  @ManyToOne(() => Product, (product) => product.reviews)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  storeId: number;

  @ManyToOne(() => Store, { nullable: true })
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column()
  orderItemId: number;

  // ✅ เพิ่ม 3 คอลัมน์ใหม่
  @Column({ type: 'text', nullable: true })
  sellerReply: string; // ข้อความตอบกลับจากร้านค้า

  @Column({ default: false })
  isEdited: boolean; // แก้ไขแล้วหรือยัง (True = ห้ามแก้ซ้ำ)

  @Column({ default: false })
  isHidden: boolean; // ถูกซ่อนโดย Admin หรือไม่
}

