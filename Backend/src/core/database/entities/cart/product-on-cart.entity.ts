import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cart } from './cart.entity';
import { Product } from '../product/product.entity';
import { ProductVariant } from '../product/product-variant.entity';

@Entity('productoncart')
export class ProductOnCart {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  cartId: number;

  @Column()
  productId: number;

  // ✅ เพิ่มคอลัมน์นี้ (nullable=true เพราะสินค้าบางชิ้นอาจไม่มีตัวเลือก)
  @Column({ nullable: true })
  variantId: number;

  @Column()
  count: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @ManyToOne(() => Cart, (cart) => cart.productOnCarts)
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  @ManyToOne(() => Product, (product) => product.productOnCarts)
  @JoinColumn({ name: 'productId' })
  product: Product;

  // ✅ เพิ่ม Relation เพื่อดึงชื่อ/ราคาของตัวเลือกมาโชว์
  // ✅ เพิ่ม onDelete: 'SET NULL' เพื่อให้ลบ variant ได้โดยไม่ติด FK constraint
  @ManyToOne(() => ProductVariant, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;
}

