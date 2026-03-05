import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
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

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}

