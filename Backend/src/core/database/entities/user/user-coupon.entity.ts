import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Coupon } from '../coupon/coupon.entity';

@Entity('user_coupon')
export class UserCoupon {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  userId: number;

  @Column()
  couponId: number;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ type: 'datetime', nullable: true })
  usedAt: Date;

  @Column({ nullable: true })
  usedInOrderId: number;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  collectedAt: Date;

  @CreateDateColumn({ name: 'createdAt', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'datetime', precision: 6 })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Coupon)
  @JoinColumn({ name: 'couponId' })
  coupon: Coupon;
}

