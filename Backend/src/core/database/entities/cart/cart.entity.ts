import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../base/base.entity';
import { User } from '../user/user.entity';
import { ProductOnCart } from './product-on-cart.entity';

@Entity('cart')
export class Cart extends BaseEntity {
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cartTotal: number;

  @Column()
  orderedById: number;

  @ManyToOne(() => User, (user) => user.carts)
  @JoinColumn({ name: 'orderedById' })
  orderedBy: User;

  @OneToMany(() => ProductOnCart, (productOnCart) => productOnCart.cart)
  productOnCarts: ProductOnCart[];
}

