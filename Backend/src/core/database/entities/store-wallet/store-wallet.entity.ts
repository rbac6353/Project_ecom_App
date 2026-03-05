import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Store } from '../store/store.entity';
import { StoreWalletTransaction } from './store-wallet-transaction.entity';

@Entity('store_wallet')
export class StoreWallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  balance: string; // ใช้ string สำหรับ decimal เพื่อความแม่นยำ

  @Column({ unique: true })
  storeId: number;

  @OneToOne(() => Store)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @OneToMany(() => StoreWalletTransaction, (transaction) => transaction.wallet)
  transactions: StoreWalletTransaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
