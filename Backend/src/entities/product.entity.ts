import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { Store } from './store.entity';
import { Image } from './image.entity';
import { ProductOnCart } from './product-on-cart.entity';
import { ProductOnOrder } from './product-on-order.entity';
import { Review } from './review.entity';
import { Wishlist } from './wishlist.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('product')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  // 🛠️ แก้ไข 1: เปลี่ยนเป็น text เพื่อให้ใส่รายละเอียดได้ยาวๆ (มีอยู่แล้ว)
  @Column({ type: 'text', nullable: true })
  description: string;

  // 🛠️ แก้ไข 2: เปลี่ยนเป็น decimal เพื่อความแม่นยำทางการเงิน (10 หลัก, ทศนิยม 2 ตำแหน่ง)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ default: 0 })
  sold: number;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountPrice: number;

  @Column({ type: 'datetime', nullable: true })
  discountStartDate: Date;

  @Column({ type: 'datetime', nullable: true })
  discountEndDate: Date;

  // 🛠️ เพิ่มใหม่ 1: Slug สำหรับ URL ที่สวยงาม
  @Column({ unique: true, nullable: true })
  slug: string;

  // 🛠️ เพิ่มใหม่ 2: สถานะสินค้า (เปิด/ปิดการขาย)
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  categoryId: number;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ nullable: true })
  storeId: number;

  @ManyToOne(() => Store, (store) => store.products)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column({ nullable: true })
  subcategoryId: number;

  // 🛠️ เพิ่มใหม่ 3: ชื่อหมวดหมู่ย่อย (String) เพื่อให้ง่ายต่อการกรอง
  @Column({ nullable: true })
  subcategory: string;

  @OneToMany(() => Image, (image) => image.product)
  images: Image[];

  @OneToMany(() => ProductOnCart, (productOnCart) => productOnCart.product)
  productOnCarts: ProductOnCart[];

  @OneToMany(() => ProductOnOrder, (productOnOrder) => productOnOrder.product)
  productOnOrders: ProductOnOrder[];

  @OneToMany(() => Review, (review) => review.product)
  reviews: Review[];

  @OneToMany(() => Wishlist, (wishlist) => wishlist.product)
  wishlists: Wishlist[];

  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
  })
  variants: ProductVariant[];
}

