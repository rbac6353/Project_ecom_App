import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StoreWallet } from './store-wallet.entity';

export enum StoreTransactionType {
  SALE_REVENUE = 'SALE_REVENUE',
  WITHDRAWAL = 'WITHDRAWAL',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('store_wallet_transaction')
export class StoreWalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  walletId: number;

  @ManyToOne(() => StoreWallet, (wallet) => wallet.transactions)
  @JoinColumn({ name: 'walletId' })
  wallet: StoreWallet;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string; // บวก = รายรับ, ลบ = ถอนออก

  @Column({
    type: 'enum',
    enum: StoreTransactionType,
  })
  type: StoreTransactionType;

  @Column({ nullable: true })
  referenceId: string; // เช่น "ORDER_123"

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
