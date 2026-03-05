import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from '../category/category.entity';
import { Subcategory } from '../category/subcategory.entity';
import { Store } from '../store/store.entity';
import { Image } from './image.entity';
import { ProductOnCart } from '../cart/product-on-cart.entity';
import { ProductOnOrder } from '../order/product-on-order.entity';
import { Review } from '../review/review.entity';
import { Wishlist } from '../wishlist/wishlist.entity';
import { ProductVariant } from './product-variant.entity';
import { RecentlyViewed } from './recently-viewed.entity';

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

  // ✅ Relation กับ Subcategory
  @ManyToOne(() => Subcategory, (subcategory) => subcategory.products, {
    nullable: true,
  })
  @JoinColumn({ name: 'subcategoryId' })
  subcategory: Subcategory;

  // 🛠️ ชื่อหมวดหมู่ย่อย (String) - เก็บไว้เพื่อ backward compatibility
  // แต่ควรใช้ subcategoryId และ relation แทน
  @Column({ nullable: true, name: 'subcategory' }) // ✅ ใช้ name: 'subcategory' เพื่อให้ตรงกับ database column
  subcategoryName: string;

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

