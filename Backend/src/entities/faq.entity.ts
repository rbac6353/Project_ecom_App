import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Faq {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  question: string; // คำถาม

  @Column({ type: 'text' })
  answer: string; // คำตอบ (อาจยาวได้)

  @Column()
  category: string; // หมวดหมู่ (เช่น 'General', 'Payment', 'Shipping')

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

