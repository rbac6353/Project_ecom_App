import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('notification')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  title: string;

  @Column()
  body: string;

  @Column({ nullable: true })
  type: string; // 'ORDER', 'PROMOTION', 'SYSTEM'

  @Column({ type: 'simple-json', nullable: true }) // เก็บ data เป็น JSON (เช่น { orderId: 1, url: "gtxshop://order/123" })
  data: any;

  @Column({ default: false })
  isRead: boolean; // อ่านหรือยัง

  @CreateDateColumn({ name: 'createdAt', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'datetime', precision: 6 })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}

