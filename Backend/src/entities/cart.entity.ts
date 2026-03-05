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
import { User } from './user.entity';
import { ProductOnCart } from './product-on-cart.entity';

@Entity('cart')
export class Cart {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cartTotal: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  orderedById: number;

  @ManyToOne(() => User, (user) => user.carts)
  @JoinColumn({ name: 'orderedById' })
  orderedBy: User;

  @OneToMany(() => ProductOnCart, (productOnCart) => productOnCart.cart)
  productOnCarts: ProductOnCart[];
}

