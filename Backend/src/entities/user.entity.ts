import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Cart } from './cart.entity';
import { Order } from './order.entity';
import { Review } from './review.entity';
import { Coupon } from './coupon.entity';
import { Store } from './store.entity';
import { Wishlist } from './wishlist.entity';
import { Notification } from './notification.entity';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
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
}

