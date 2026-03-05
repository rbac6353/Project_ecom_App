import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

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

  @CreateDateColumn({ name: 'createdAt', type: 'datetime', precision: 6 })
  createdAt: Date;

  // ✅ ไม่มี updatedAt เพราะ admin_log เป็น insert-only table (ไม่ update)

  @ManyToOne(() => User)
  @JoinColumn({ name: 'adminId' })
  admin: User; // เชื่อมไปหา Admin เพื่อดึงชื่อมาโชว์
}

