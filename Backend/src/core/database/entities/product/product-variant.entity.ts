import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity()
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @Column()
  name: string; // เช่น "สีแดง - XL", "32GB - Black"

  @Column({ length: 64, nullable: true })
  sku: string | null; // รหัส SKU ต่อ variant เช่น SHIRT-001-RED-S

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number; // ถ้าราคาต่างจากตัวแม่ ให้ใส่ค่านี้ (ถ้าเหมือนกันให้เป็น null)

  @Column()
  stock: number; // สต็อกเฉพาะตัวเลือกนี้

  // ✅ index ของรูป (1 = รูปแรก, 2 = รูปที่สอง ...)
  @Column({ type: 'int', nullable: true })
  imageIndex: number | null;

  // ✅ เก็บ attributes ทั้งหมดในรูปแบบ JSON เช่น {"COLOR": "ดำ", "MEMORY": "128GB", "SIZE": "M"}
  @Column({ type: 'json', nullable: true })
  attributes: Record<string, string> | null; // JSON object

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;
}

