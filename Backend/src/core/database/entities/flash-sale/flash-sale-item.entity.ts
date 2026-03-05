import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { FlashSale } from './flash-sale.entity';
import { Product } from '../product/product.entity';

@Entity('flash_sale_item')
export class FlashSaleItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  flashSaleId: number;

  @Column()
  productId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'discountPrice' })
  discountPrice: number; // ราคา Flash Sale (ตรงกับ database: discountPrice)

  @Column({ type: 'int', name: 'limitStock' })
  limitStock: number; // โควตาสำหรับ Flash Sale (ตรงกับ database: limitStock)

  @Column({ type: 'int', default: 0 })
  sold: number; // ขายไปแล้วกี่ชิ้น (เอาไว้ทำ Progress Bar)

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => FlashSale, (flashSale) => flashSale.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'flashSaleId' })
  flashSale: FlashSale;

  @ManyToOne(() => Product, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;
}
