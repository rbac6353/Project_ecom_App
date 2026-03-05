import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Banner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  imageUrl: string; // URL รูปจาก Cloudinary

  @Column({ nullable: true })
  title: string; // คำอธิบาย (เผื่อใช้ alt text)

  @Column({ nullable: true })
  link: string; // Deep Link (เช่น gtxshop://product/1)

  @Column({ default: true })
  isActive: boolean; // เปิด/ปิด การแสดงผล

  @Column({ default: 0 })
  displayOrder: number; // ลำดับการโชว์ (0, 1, 2...)

  @CreateDateColumn({ name: 'createdAt', type: 'datetime', precision: 6 })
  createdAt: Date;
}

