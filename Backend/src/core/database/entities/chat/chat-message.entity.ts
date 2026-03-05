import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../base/base.entity';
import { User } from '../user/user.entity';

@Entity('chat_message')
export class ChatMessage extends BaseEntity {
  @Column()
  roomId: string; // ใช้ userId ของลูกค้าเป็นชื่อห้อง (User 1 คน มี 1 ห้องแชทกับร้านค้า)

  @Column()
  senderId: number; // ใครเป็นคนส่ง

  @Column({ type: 'text' })
  message: string;

  // ✅ ประเภทข้อความ: 'text' หรือ 'image' (หรือชนิดอื่นในอนาคต)
  @Column({ default: 'text' })
  type: string;

  // ✅ URL รูปภาพ (ถ้าเป็นข้อความแบบ image)
  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: false })
  isRead: boolean; // อ่านหรือยัง

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;
}

