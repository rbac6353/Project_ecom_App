import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../product/product.entity';
import { ProductVariant } from '../product/product-variant.entity';

@Entity('productonorder')
export class ProductOnOrder {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  productId: number;

  // ✅ เพิ่มคอลัมน์นี้
  @Column({ nullable: true })
  variantId: number;

  @Column()
  orderId: number;

  @Column()
  count: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @ManyToOne(() => Product, (product) => product.productOnOrders)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => Order, (order) => order.productOnOrders)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  // ✅ เพิ่ม Relation (เผื่อดึงชื่อรุ่นมาโชว์ในประวัติ)
  @ManyToOne(() => ProductVariant)
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;
}

