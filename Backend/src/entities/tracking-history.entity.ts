import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity()
export class TrackingHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number;

  @Column()
  status: string; // เช่น 'READY_TO_SHIP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'

  @Column()
  title: string; // หัวข้อเช่น "เข้ารับพัสดุแล้ว"

  @Column({ nullable: true })
  description: string; // รายละเอียดเพิ่มเติม

  @Column({ nullable: true })
  location: string; // สถานที่หรือข้อความตำแหน่ง (optional)

  @CreateDateColumn()
  createdAt: Date; // เวลาที่เกิดเหตุการณ์

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;
}


