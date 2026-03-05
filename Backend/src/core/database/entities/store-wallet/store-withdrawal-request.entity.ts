import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Store } from '../store/store.entity';
import { StoreWallet } from './store-wallet.entity';

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('store_withdrawal_request')
export class StoreWithdrawalRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  storeId: number;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column()
  walletId: number;

  @ManyToOne(() => StoreWallet)
  @JoinColumn({ name: 'walletId' })
  wallet: StoreWallet;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string; // จำนวนเงินที่ขอถอน

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  // ✅ Bank Details Snapshot (เก็บข้อมูล ณ เวลาที่ขอถอน)
  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  accountNumber: string;

  @Column({ nullable: true })
  accountName: string;

  // ✅ Admin Fields
  @Column({ nullable: true })
  proofImage: string; // รูปสลิปที่ Admin โอนเงินให้ร้านค้า

  @Column({ type: 'text', nullable: true })
  adminNote: string; // เหตุผลการปฏิเสธ หรือหมายเหตุอื่นๆ

  @Column({ nullable: true })
  processedBy: number; // Admin ID ที่ดำเนินการ

  @Column({ type: 'datetime', nullable: true })
  processedAt: Date; // เวลาที่ดำเนินการ

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
