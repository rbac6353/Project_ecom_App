import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Review } from './review.entity';
import { User } from './user.entity'; // คนแจ้ง (Seller)

export enum ReportStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED', // ลบรีวิวแล้ว
  REJECTED = 'REJECTED', // คำร้องตกไป (ไม่ลบ)
}

@Entity('review_report')
export class ReviewReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reviewId: number;

  @Column()
  reporterId: number; // Seller ID

  @Column({ type: 'text' })
  reason: string; // เหตุผลที่แจ้งลบ

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Review, { onDelete: 'CASCADE' }) // ถ้ารีวิวโดนลบ รายงานก็หายไปด้วย
  @JoinColumn({ name: 'reviewId' })
  review: Review;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporterId' })
  reporter: User;
}

