import {
  Entity,
  Column,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Cart } from '../cart/cart.entity';
import { Order } from '../order/order.entity';
import { Review } from '../review/review.entity';
import { Coupon } from '../coupon/coupon.entity';
import { Store } from '../store/store.entity';
import { Wishlist } from '../wishlist/wishlist.entity';
import { Notification } from '../notification/notification.entity';
import { Wallet } from '../wallet/wallet.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  picture: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  notificationToken: string;

  @Column({ nullable: true })
  resetPasswordToken: string;

  @Column({ nullable: true })
  resetPasswordExpires: Date;

  @Column({ default: false })
  isEmailVerified: boolean; // ยืนยันอีเมลหรือยัง

  @Column({ nullable: true })
  verificationToken: string; // เก็บ OTP 6 หลัก หรือ Token ยาวๆ

  @Column({ nullable: true, unique: true })
  googleId: string; // เก็บ ID ของ Google (sub)

  @Column({ nullable: true, unique: true })
  facebookId: string; // เก็บ ID ของ Facebook

  // ✅ แต้มสะสม (Loyalty Points)
  @Column({ default: 0 })
  points: number;

  @CreateDateColumn({ name: 'createdAt', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'datetime', precision: 6 })
  updatedAt: Date;

  @OneToMany(() => Cart, (cart) => cart.orderedBy)
  carts: Cart[];

  @OneToMany(() => Order, (order) => order.orderedBy)
  orders: Order[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  @OneToMany(() => Coupon, (coupon) => coupon.user)
  coupons: Coupon[];

  @OneToMany(() => Store, (store) => store.owner)
  stores: Store[];

  @OneToMany(() => Wishlist, (wishlist) => wishlist.user)
  wishlists: Wishlist[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;
}

