import {
  Entity,
  Column,
} from 'typeorm';
import { BaseEntity } from '../base/base.entity';

@Entity()
export class Faq extends BaseEntity {
  @Column()
  question: string; // คำถาม

  @Column({ type: 'text' })
  answer: string; // คำตอบ (อาจยาวได้)

  @Column()
  category: string; // หมวดหมู่ (เช่น 'General', 'Payment', 'Shipping')

  @Column({ default: true })
  isActive: boolean;
}

