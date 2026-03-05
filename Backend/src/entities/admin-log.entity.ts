import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('admin_log')
export class AdminLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  adminId: number; // ID ของ Admin ที่ทำรายการ

  @Column()
  action: string; // ชื่อการกระทำ เช่น 'BAN_USER', 'VERIFY_STORE', 'DELETE_STORE'

  @Column()
  targetType: string; // เป้าหมายคืออะไร เช่น 'USER', 'STORE', 'ORDER'

  @Column()
  targetId: number; // ID ของเป้าหมาย

  @Column({ type: 'text', nullable: true })
  details: string; // รายละเอียดเพิ่มเติม (เช่น ชื่อร้านที่ลบ)

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'adminId' })
  admin: User; // เชื่อมไปหา Admin เพื่อดึงชื่อมาโชว์
}

