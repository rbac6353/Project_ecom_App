import {
  Entity,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../base/base.entity';
import { Order } from '../order/order.entity';
import { User } from '../user/user.entity';
import { TrackingHistory } from './tracking-history.entity';

export enum ShipmentStatus {
  WAITING_PICKUP = 'WAITING_PICKUP', // ร้านเตรียมของเสร็จ รอไรเดอร์มารับ
  IN_TRANSIT = 'IN_TRANSIT', // รับของแล้ว กำลังอยู่ระหว่างทาง/ศูนย์คัดแยก
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY', // กำลังนำจ่ายให้ลูกค้า
  DELIVERED = 'DELIVERED', // ส่งสำเร็จ
  FAILED = 'FAILED', // ส่งไม่สำเร็จ
}

@Entity()
export class Shipment extends BaseEntity {
  @Column()
  orderId: number;

  @Column({ nullable: true })
  courierId: number;

  @Column({
    type: 'enum',
    enum: ShipmentStatus,
    default: ShipmentStatus.WAITING_PICKUP,
  })
  status: ShipmentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  codAmount: number;

  @Column({ default: false })
  isCodPaid: boolean;

  @Column({ nullable: true })
  proofImage: string;

  @Column({ nullable: true })
  signatureImage: string; // URL รูปลายเซ็น หรือ base64 ตามที่ backend รองรับ

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ nullable: true })
  failedReason: string;

  @Column({ type: 'datetime', nullable: true })
  pickupTime: Date;

  @Column({ type: 'datetime', nullable: true })
  deliveredTime: Date;

  @OneToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'courierId' })
  courier: User;
}

