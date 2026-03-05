import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('image')
export class Image {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ nullable: true })
  asset_id: string;

  @Column({ nullable: true })
  public_id: string;

  @Column({ nullable: true })
  secure_url: string;

  @Column()
  url: string;

  @Column()
  productId: number;

  @ManyToOne(() => Product, (product) => product.images)
  @JoinColumn({ name: 'productId' })
  product: Product;
}

