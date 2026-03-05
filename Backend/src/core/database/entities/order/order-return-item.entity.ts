import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderReturn } from './order-return.entity';
import { Product } from '../product/product.entity';
import { ProductOnOrder } from './product-on-order.entity';

@Entity('order_return_items')
export class OrderReturnItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderReturnId: number;

  @ManyToOne(() => OrderReturn, (orderReturn) => orderReturn.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderReturnId' })
  orderReturn: OrderReturn;

  @Column()
  orderItemId: number;

  @ManyToOne(() => ProductOnOrder, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderItemId' })
  orderItem: ProductOnOrder;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;
}

