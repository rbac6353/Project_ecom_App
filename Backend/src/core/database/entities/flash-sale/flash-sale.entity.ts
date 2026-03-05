import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { FlashSaleItem } from './flash-sale-item.entity';

@Entity('flash_sale')
export class FlashSale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // เช่น "12.12 Midnight Sale", "Flash Sale รอบเที่ยง"

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime' })
  endTime: Date;

  @Column({ default: true })
  isActive: boolean; // เปิด/ปิด Campaign

  @Column({ type: 'text', nullable: true })
  description: string; // คำอธิบาย Campaign

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @OneToMany(() => FlashSaleItem, (item) => item.flashSale, {
    cascade: true,
  })
  items: FlashSaleItem[];
}
