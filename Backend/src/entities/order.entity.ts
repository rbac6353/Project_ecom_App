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
import { ProductOnOrder } from './product-on-order.entity';
import { Coupon } from './coupon.entity';

// 🛠️ สร้าง Enum เพื่อคุมสถานะให้ถูกต้องเสมอ
export enum OrderStatus {
  /**
   * รอชำระเงิน / รอการยืนยันการชำระ (ใช้คู่กับ paymentIntent หรือ slip)
   * ตรงกับแท็บ "ที่ต้องชำระ" (ถ้ามี)
   */
  PENDING = 'PENDING',

  /**
   * รอตรวจสอบสลิปการโอนเงินโดยแอดมิน
   */
  VERIFYING = 'VERIFYING',

  /**
   * รอร้านค้ายืนยันรับออเดอร์ (หลังจากร้านกดยอมรับออเดอร์แล้ว)
   * ร้านค้าต้องยืนยันรับออเดอร์ภายใน 24 ชั่วโมง
   */
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',

  /**
   * ชำระเงินเรียบร้อยแล้ว รอร้าน "จัดส่งสินค้า"
   * ตรงกับแท็บ "ที่ต้องจัดส่ง" (To Ship)
   */
  PROCESSING = 'PROCESSING',

  /**
   * ร้านเตรียมสินค้าเสร็จแล้ว พร้อมจัดส่ง (กำลังหาไรเดอร์)
   * ตรงกับแท็บ "ที่ต้องจัดส่ง" (To Ship)
   */
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',

  /**
   * มีไรเดอร์รับงานแล้ว กำลังไปรับสินค้า
   * ตรงกับแท็บ "ที่ต้องได้รับ" (To Receive)
   */
  RIDER_ASSIGNED = 'RIDER_ASSIGNED',

  /**
   * ไรเดอร์รับสินค้าจากร้านแล้ว
   * ตรงกับแท็บ "ที่ต้องได้รับ" (To Receive)
   */
  PICKED_UP = 'PICKED_UP',

  /**
   * ร้านกด "จัดส่งแล้ว" / สินค้าอยู่ระหว่างขนส่ง (ไรเดอร์รับของแล้ว)
   * ตรงกับแท็บ "ที่ต้องได้รับ" (To Receive)
   */
  SHIPPED = 'SHIPPED',

  /**
   * ไรเดอร์กำลังนำจ่ายให้ลูกค้า (Out for Delivery)
   * ตรงกับแท็บ "ที่ต้องได้รับ" (To Receive)
   */
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',

  /**
   * ขนส่งอัปเดตว่าส่งถึงปลายทางแล้ว (Delivered by courier)
   * ยังรอลูกค้ากดยืนยันรับสินค้า
   */
  DELIVERED = 'DELIVERED',

  /**
   * ลูกค้ากด "ฉันได้รับสินค้าแล้ว" หรือระบบ Auto-confirm
   * ธุรกรรมเสร็จสมบูรณ์
   * ตรงกับแท็บ "สำเร็จ" (Completed)
   */
  COMPLETED = 'COMPLETED',

  /**
   * ออเดอร์ถูกยกเลิก (ก่อนหรือหลังชำระ ขึ้นอยู่กับ business rule)
   * ตรงกับแท็บ "ยกเลิก" (Cancelled) ถ้ามี
   */
  CANCELLED = 'CANCELLED',

  /**
   * มีการเปิดเคสขอคืนเงิน/คืนสินค้า (ใช้คู่กับ RefundStatus)
   */
  REFUND_REQUESTED = 'REFUND_REQUESTED',

  /**
   * เคสคืนเงิน/คืนสินค้าดำเนินการเสร็จสิ้นแล้ว
   */
  REFUNDED = 'REFUNDED',
}

// ✅ เพิ่ม Enum สำหรับสถานะการคืนเงิน
export enum RefundStatus {
  NONE = 'NONE',             // ปกติ
  REQUESTED = 'REQUESTED',   // ลูกค้ากดขอมา
  APPROVED = 'APPROVED',     // ร้านอนุมัติ (คืนเงิน/ของ)
  REJECTED = 'REJECTED',     // ร้านปฏิเสธ
}

@Entity('order')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cartTotal: number;

  // 🛠️ แก้ไขชื่อจาก oderStatus เป็น orderStatus และใช้ Enum
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  orderStatus: OrderStatus;

  @Column({ nullable: true })
  shippingAddress: string;

  @Column({ nullable: true })
  shippingPhone: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ nullable: true })
  discountCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  orderedById: number;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'orderedById' })
  orderedBy: User;

  @Column({ nullable: true })
  couponId: number;

  @ManyToOne(() => Coupon, { nullable: true })
  @JoinColumn({ name: 'couponId' })
  coupon: Coupon;

  // ✅ แก้ไขตรงนี้: เพิ่ม { cascade: true }
  @OneToMany(() => ProductOnOrder, (productOnOrder) => productOnOrder.order, {
    cascade: true,
  })
  productOnOrders: ProductOnOrder[];

  // ✅ เพิ่ม 2 คอลัมน์นี้
  @Column({
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.NONE,
  })
  refundStatus: RefundStatus;

  @Column({ type: 'text', nullable: true })
  refundReason: string; // เหตุผลที่ขอคืน เช่น "สินค้าชำรุด"

  // ✅ เพิ่มฟิลด์สำหรับวิธีการชำระเงิน
  @Column({ nullable: true, default: 'STRIPE' })
  paymentMethod: string; // 'STRIPE' หรือ 'COD' (Cash on Delivery)

  // ✅ เพิ่มฟิลด์สำหรับเวลาหมดอายุการชำระเงิน (30 นาที)
  @Column({ type: 'datetime', nullable: true })
  paymentExpiredAt: Date;

  // ✅ เพิ่มฟิลด์สำหรับ URL สลิปการโอนเงิน
  @Column({ nullable: true })
  paymentSlipUrl: string;

  // ✅ เพิ่มฟิลด์สำหรับเลขพัสดุและบริษัทขนส่ง
  @Column({ nullable: true })
  trackingNumber: string; // เลขพัสดุ (เช่น TH12345678)

  @Column({ nullable: true })
  logisticsProvider: string; // บริษัทขนส่ง (เช่น Kerry, Flash, J&T)

  // ✅ เวลาที่ลูกค้ากดยืนยัน "ได้รับสินค้าแล้ว"
  @Column({ type: 'datetime', nullable: true })
  receivedAt: Date;
}

