import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
// import { BaseEntity } from '../base/base.entity'; // Removed - table doesn't have updatedAt
import { User } from '../user/user.entity';
import { Store } from './store.entity';

@Entity()
@Unique(['userId', 'storeId']) // ป้องกันการกดซ้ำ
export class StoreFollower { // No longer extends BaseEntity
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  storeId: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'storeId' })
  store: Store;
}

