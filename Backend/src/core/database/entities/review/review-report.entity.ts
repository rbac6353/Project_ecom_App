import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../base/base.entity';
import { Review } from './review.entity';
import { User } from '../user/user.entity';

export enum ReportStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED', // ลบรีวิวแล้ว
  REJECTED = 'REJECTED', // คำร้องตกไป (ไม่ลบ)
}

@Entity('review_report')
export class ReviewReport extends BaseEntity {
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

  @ManyToOne(() => Review, { onDelete: 'CASCADE' }) // ถ้ารีวิวโดนลบ รายงานก็หายไปด้วย
  @JoinColumn({ name: 'reviewId' })
  review: Review;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  // Override updatedAt from BaseEntity - review_report table doesn't have updatedAt column
  // Use select: false to prevent TypeORM from querying this non-existent column
  @Column({ name: 'updatedAt', type: 'datetime', nullable: true, select: false })
  updatedAt: undefined;
}

