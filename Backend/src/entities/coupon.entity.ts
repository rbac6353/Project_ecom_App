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
import { Order } from './order.entity';
import { Store } from './store.entity';

@Entity('coupon')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  // ประเภทคูปอง: DISCOUNT (ส่วนลด), SHIPPING (ฟรีค่าจัดส่ง), COIN (เงินคืน)
  @Column({ type: 'varchar', length: 20, default: 'DISCOUNT' })
  type: string;

  // ส่วนลด
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountPercent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minPurchase: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscount: number;

  // ข้อมูลคูปอง
  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // ระยะเวลาใช้งาน
  @Column({ type: 'datetime', nullable: true })
  startDate: Date;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date;

  // จำนวนจำกัด
  @Column({ type: 'int', nullable: true })
  totalQuantity: number; // จำนวนคูปองทั้งหมด (null = ไม่จำกัด)

  @Column({ type: 'int', default: 1 })
  perUserLimit: number; // จำนวนต่อผู้ใช้ (default = 1)

  @Column({ type: 'int', default: 0 })
  usedCount: number; // จำนวนที่ใช้ไปแล้ว

  // ผู้ใช้เป้าหมาย: ALL, NEW_USER, EXISTING_USER
  @Column({ type: 'varchar', length: 20, default: 'ALL' })
  targetUsers: string;

  // หมวดหมู่สินค้า (JSON array ของ category IDs)
  @Column({ type: 'text', nullable: true })
  categoryIds: string; // JSON array เช่น "[1,2,3]"

  // คูปองของร้านค้า (null = Platform Voucher ใช้ได้ทุกร้าน)
  @Column({ nullable: true })
  storeId: number;

  @ManyToOne(() => Store, { nullable: true })
  @JoinColumn({ name: 'storeId' })
  store: Store;

  // สถานะ
  @Column({ default: false })
  isUsed: boolean; // สำหรับคูปองที่ user เก็บไว้แล้ว (deprecated - ใช้ใน UserCoupon แทน)

  @Column({ type: 'datetime', nullable: true })
  usedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  userId: number; // ผู้สร้างคูปอง (Admin หรือ Seller)

  @ManyToOne(() => User, (user) => user.coupons)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Order, (order) => order.coupon)
  orders: Order[];
}

