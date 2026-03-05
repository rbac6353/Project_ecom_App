import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class NotificationSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ default: true })
  orderUpdate: boolean; // แจ้งเตือนสถานะออเดอร์

  @Column({ default: true })
  promotion: boolean; // แจ้งเตือนโปรโมชั่น

  @Column({ default: true })
  chat: boolean; // แจ้งเตือนแชท

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}

